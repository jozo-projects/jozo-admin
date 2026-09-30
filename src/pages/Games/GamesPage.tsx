import { Game, GameType } from "@/@types/Game";
import { DeleteModal, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDeleteGame,
  useDeleteGameType,
  useGetGames,
  useGetGameTypes,
} from "@/hooks/use-games";
import { Edit, Gamepad2, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { UpsertGameModal, UpsertGameTypeModal } from "./components";
import { useGamesQueryConfig } from "./hooks";
import { ActiveFilterValue } from "./types";

const GamesPage = () => {
  const { queryConfig, setQueryConfig } = useGamesQueryConfig();
  const [selectedGameType, setSelectedGameType] = useState<GameType | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isGameTypeModalOpen, setIsGameTypeModalOpen] = useState(false);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [gameTypeToDelete, setGameTypeToDelete] = useState<GameType | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);

  const typeIsActiveFilter = queryConfig.typeIsActive as ActiveFilterValue;
  const gameIsActiveFilter = queryConfig.gameIsActive as ActiveFilterValue;

  const gameTypeQuery = {
    keyword: queryConfig.typeKeyword || undefined,
    isActive:
      typeIsActiveFilter === "all"
        ? undefined
        : typeIsActiveFilter === "active",
  };

  const gameQuery = {
    keyword: queryConfig.gameKeyword || undefined,
    typeId: queryConfig.gameTypeId === "all" ? undefined : queryConfig.gameTypeId,
    isActive:
      gameIsActiveFilter === "all"
        ? undefined
        : gameIsActiveFilter === "active",
  };

  const {
    data: gameTypes = [],
    isLoading: isLoadingGameTypes,
    isFetching: isFetchingGameTypes,
  } = useGetGameTypes(gameTypeQuery);
  const {
    data: games = [],
    isLoading: isLoadingGames,
    isFetching: isFetchingGames,
  } = useGetGames(gameQuery);
  const { mutateAsync: deleteGameType, isPending: isDeletingGameType } =
    useDeleteGameType();
  const { mutateAsync: deleteGame, isPending: isDeletingGame } = useDeleteGame();

  const activeTab = queryConfig.tab === "games" ? "games" : "types";

  const getTypeName = (game: Game) => {
    if (game.gameTypeLabel?.name) return game.gameTypeLabel.name;
    const matchedType = gameTypes.find((item) => item._id === game.typeId);
    return matchedType?.name || "Không xác định";
  };

  const openCreateGameTypeModal = () => {
    setSelectedGameType(null);
    setIsGameTypeModalOpen(true);
  };

  const openEditGameTypeModal = (item: GameType) => {
    setSelectedGameType(item);
    setIsGameTypeModalOpen(true);
  };

  const openCreateGameModal = () => {
    setSelectedGame(null);
    setIsGameModalOpen(true);
  };

  const openEditGameModal = (item: Game) => {
    setSelectedGame(item);
    setIsGameModalOpen(true);
  };

  const handleDeleteGameType = async () => {
    if (!gameTypeToDelete?._id) return;
    await deleteGameType(gameTypeToDelete._id);
    setGameTypeToDelete(null);
  };

  const handleDeleteGame = async () => {
    if (!gameToDelete?._id) return;
    await deleteGame(gameToDelete._id);
    setGameToDelete(null);
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Games Management"
        description="Quản lý loại game và danh sách game."
        icon={Gamepad2}
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setQueryConfig({
            tab: value,
          });
        }}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="types">Game Types</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Tìm theo tên hoặc slug loại game"
                    value={queryConfig.typeKeyword}
                    onChange={(event) =>
                      setQueryConfig({
                        typeKeyword: event.target.value,
                      })
                    }
                  />
                </div>

                <Select
                  value={typeIsActiveFilter}
                  onValueChange={(value) =>
                    setQueryConfig({
                      typeIsActive: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="active">Đang bật</SelectItem>
                    <SelectItem value="inactive">Đang tắt</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={openCreateGameTypeModal}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo Game Type
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ảnh</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-[140px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingGameTypes ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Đang tải dữ liệu...
                      </TableCell>
                    </TableRow>
                  ) : gameTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Chưa có loại game nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    gameTypes.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-12 w-12 rounded-md border object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-md border text-xs text-muted-foreground">
                              N/A
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.slug}</TableCell>
                        <TableCell className="max-w-[320px] truncate">
                          {item.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.isActive ? "default" : "secondary"}>
                            {item.isActive ? "Đang bật" : "Đang tắt"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditGameTypeModal(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setGameTypeToDelete(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {isFetchingGameTypes && !isLoadingGameTypes ? (
            <p className="text-sm text-muted-foreground">Đang cập nhật danh sách...</p>
          ) : null}
        </TabsContent>

        <TabsContent value="games" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_200px_220px_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Tìm theo tên, slug hoặc mô tả"
                    value={queryConfig.gameKeyword}
                    onChange={(event) =>
                      setQueryConfig({
                        gameKeyword: event.target.value,
                      })
                    }
                  />
                </div>

                <Select
                  value={gameIsActiveFilter}
                  onValueChange={(value) =>
                    setQueryConfig({
                      gameIsActive: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="active">Đang bật</SelectItem>
                    <SelectItem value="inactive">Đang tắt</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={queryConfig.gameTypeId}
                  onValueChange={(value) =>
                    setQueryConfig({
                      gameTypeId: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Loại game" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả loại game</SelectItem>
                    {gameTypes.map((item) => (
                      <SelectItem key={item._id} value={item._id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button onClick={openCreateGameModal}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo Game
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên game</TableHead>
                    <TableHead>Loại game</TableHead>
                    <TableHead>Người chơi</TableHead>
                    <TableHead>Thời lượng</TableHead>
                    <TableHead>Mô tả ngắn</TableHead>
                    <TableHead>Số ảnh</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-[140px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingGames ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Đang tải dữ liệu...
                      </TableCell>
                    </TableRow>
                  ) : games.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Chưa có game nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    games.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.slug}</div>
                        </TableCell>
                        <TableCell>{getTypeName(item)}</TableCell>
                        <TableCell>
                          {item.minPlayers} - {item.maxPlayers}
                        </TableCell>
                        <TableCell>{item.playTimeMinutes} phút</TableCell>
                        <TableCell className="max-w-[360px] truncate">
                          {item.shortDescription || "-"}
                        </TableCell>
                        <TableCell>{item.images?.length || 0}</TableCell>
                        <TableCell>
                          <Badge variant={item.isActive ? "default" : "secondary"}>
                            {item.isActive ? "Đang bật" : "Đang tắt"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditGameModal(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setGameToDelete(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {isFetchingGames && !isLoadingGames ? (
            <p className="text-sm text-muted-foreground">Đang cập nhật danh sách...</p>
          ) : null}
        </TabsContent>
      </Tabs>

      <UpsertGameTypeModal
        isOpen={isGameTypeModalOpen}
        onClose={() => setIsGameTypeModalOpen(false)}
        selectedItem={selectedGameType}
      />
      <UpsertGameModal
        isOpen={isGameModalOpen}
        onClose={() => setIsGameModalOpen(false)}
        selectedItem={selectedGame}
        gameTypes={gameTypes}
      />

      <DeleteModal
        isOpen={Boolean(gameTypeToDelete)}
        onClose={() => setGameTypeToDelete(null)}
        onConfirm={handleDeleteGameType}
        title="Xóa loại game"
        description={`Bạn có chắc chắn muốn xóa "${gameTypeToDelete?.name}"?`}
        isLoading={isDeletingGameType}
      />
      <DeleteModal
        isOpen={Boolean(gameToDelete)}
        onClose={() => setGameToDelete(null)}
        onConfirm={handleDeleteGame}
        title="Xóa game"
        description={`Bạn có chắc chắn muốn xóa "${gameToDelete?.name}"?`}
        isLoading={isDeletingGame}
      />
    </div>
  );
};

export default GamesPage;
