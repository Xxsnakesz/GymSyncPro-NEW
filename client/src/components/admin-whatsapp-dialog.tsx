import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface MemberInfo {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
}

interface AdminWhatsappDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberInfo | null;
}

export default function AdminWhatsappDialog({ open, onOpenChange, member }: AdminWhatsappDialogProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open && member) {
      const name = `${member.firstName || ""} ${member.lastName || ""}`.trim() || member.username || "Member";
      setMessage(`Halo ${name},\n\nKami dari Idachi Fitness ingin menginformasikan bahwa keanggotaan dan layanan kami siap membantu target fitness Anda. Jika ada pertanyaan atau ingin memperpanjang membership/booking PT, balas pesan ini ya.\n\nTerima kasih! 💪`);
    }
  }, [open, member]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Member tidak ditemukan");
      return await apiRequest("POST", "/api/admin/whatsapp/send", {
        memberId: member.id,
        message,
      });
    },
    onSuccess: () => {
      toast({ title: "Terkirim", description: "Pesan WhatsApp berhasil dikirim" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err?.message || "Gagal mengirim pesan", variant: "destructive" });
    }
  });

  const phoneDisplay = member?.phone || "-";
  const nameDisplay = `${member?.firstName || ""} ${member?.lastName || ""}`.trim() || member?.username || "Member";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Kirim Pesan WhatsApp</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-muted-foreground">Kepada</div>
            <div className="col-span-2 font-medium">{nameDisplay}</div>
            <div className="text-muted-foreground">Nomor</div>
            <div className="col-span-2">{phoneDisplay}</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Pesan</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Tulis pesan WhatsApp untuk member"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button className="gym-gradient text-white" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || !message.trim()}>
              {sendMutation.isPending ? "Mengirim..." : "Kirim WhatsApp"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
