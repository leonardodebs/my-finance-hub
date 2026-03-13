import { useState } from "react";
import { useAdminUsers, useUpdateAdminUser, useDeleteAdminUser } from "../hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminUser } from "../data/adminData";

export function AdminSection() {
  const { data: users, isLoading } = useAdminUsers();
  const updateMutation = useUpdateAdminUser();
  const deleteMutation = useDeleteAdminUser();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAdmin, setEditAdmin] = useState(false);

  if (isLoading) {
    return <div className="p-4 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const handleEdit = (user: AdminUser) => {
    setEditingId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditAdmin(user.is_admin);
  };

  const handleSave = (id: string) => {
    updateMutation.mutate(
      { id, data: { name: editName, email: editEmail, is_admin: editAdmin } },
      {
        onSuccess: () => {
          toast.success("Usuário atualizado com sucesso");
          setEditingId(null);
        },
        onError: (err: any) => {
          toast.error(err.message || "Erro ao atualizar usuário");
        }
      }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir permanentemente este usuário e todos os seus dados?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("Usuário excluído"),
        onError: (err: any) => toast.error(err.message || "Erro ao excluir"),
      });
    }
  };

  return (
    <section className="space-y-4 pt-4 border-t border-border mt-8">
      <div className="flex items-center gap-2 text-primary font-semibold border-b border-border pb-2">
        <Users className="h-4 w-4" />
        Gestão de Usuários (Admin)
      </div>
      
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Acesso Admin</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {editingId === user.id ? (
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  ) : (
                    user.name
                  )}
                </TableCell>
                <TableCell>
                  {editingId === user.id ? (
                    <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                  ) : (
                    user.email
                  )}
                </TableCell>
                <TableCell>
                  {editingId === user.id ? (
                    <Switch checked={editAdmin} onCheckedChange={setEditAdmin} />
                  ) : (
                    user.is_admin ? "Sim" : "Não"
                  )}
                </TableCell>
                <TableCell className="text-right flex items-center justify-end gap-2">
                  {editingId === user.id ? (
                    <>
                      <Button size="sm" onClick={() => handleSave(user.id)} disabled={updateMutation.isPending}>Salvar</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>Editar</Button>
                      <Button size="icon" variant="destructive" onClick={() => handleDelete(user.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(!users || users.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">Nenhum usuário encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
