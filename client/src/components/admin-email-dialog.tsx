import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MemberInfo {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
}

interface AdminEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberInfo | null;
}

export default function AdminEmailDialog({ open, onOpenChange, member }: AdminEmailDialogProps) {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [template, setTemplate] = useState<string>("");

  const baseUrl = useMemo(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }, []);

  const fullName = useMemo(() => {
    return (member ? `${member.firstName || ""} ${member.lastName || ""}`.trim() : "") || member?.username || "Member";
  }, [member]);

  type TemplateDef = {
    id: string;
    label: string;
    build: () => { subject: string; message: string; ctaText?: string; ctaPath?: string };
  };

  const TEMPLATES: TemplateDef[] = [
    {
      id: "welcome",
      label: "Welcome / Onboarding",
      build: () => ({
        subject: `Selamat datang di Idachi Fitness, ${fullName}!`,
        message:
          `Halo ${fullName},\n\nSelamat datang di Idachi Fitness. Kami senang kamu bergabung! Berikut beberapa langkah cepat agar pengalamanmu maksimal:\n\n• Lengkapi profil dan preferensi latihanmu.\n• Cek jadwal kelas dan booking tempatmu lebih awal.\n• Jelajahi layanan Personal Training untuk progress lebih cepat.\n\nKalau ada pertanyaan, cukup balas email ini—tim kami siap membantu.\n\nSampai jumpa di klub!`,
        ctaText: "Mulai Jelajahi",
        ctaPath: "/",
      }),
    },
    {
      id: "expiring",
      label: "Reminder Membership Hampir Berakhir",
      build: () => ({
        subject: "Pengingat: Membership kamu segera berakhir",
        message:
          `Halo ${fullName},\n\nKami ingin mengingatkan bahwa masa aktif membership kamu akan segera berakhir. Supaya aksesmu ke kelas dan fasilitas tidak terputus, yuk perpanjang sekarang.\n\nDengan perpanjangan lebih awal, kamu tetap bisa:\n• Booking kelas tanpa hambatan\n• Mengakses seluruh fasilitas klub\n• Menjaga konsistensi progress latihannya\n\nKalau butuh rekomendasi paket, balas saja email ini ya.`,
        ctaText: "Perpanjang Membership",
        ctaPath: "/checkout",
      }),
    },
    {
      id: "expired",
      label: "Membership Telah Berakhir",
      build: () => ({
        subject: "Membership kamu telah berakhir",
        message:
          `Halo ${fullName},\n\nMembership kamu saat ini telah berakhir. Kami berharap bisa segera menyambutmu kembali di klub.\n\nAyo aktifkan lagi untuk melanjutkan progress latihan dan akses penuh ke kelas serta fasilitas Idachi Fitness. Jika kamu butuh bantuan memilih paket, tim kami siap bantu.`,
        ctaText: "Aktifkan Kembali",
        ctaPath: "/checkout",
      }),
    },
    {
      id: "class-reminder",
      label: "Reminder Kelas (Umum)",
      build: () => ({
        subject: "Reminder kelas kamu di Idachi Fitness",
        message:
          `Halo ${fullName},\n\nIni pengingat ramah untuk kelas yang akan kamu ikuti. Datang 10–15 menit lebih awal ya agar sempat pemanasan dan setup.\n\nKalau jadwal berubah, kamu bisa cek dan atur ulang booking kapan saja.`,
        ctaText: "Lihat Jadwal Kelas",
        ctaPath: "/my-bookings",
      }),
    },
    {
      id: "pt-promo",
      label: "Promo Personal Training",
      build: () => ({
        subject: "Promo Personal Training spesial untuk kamu",
        message:
          `Halo ${fullName},\n\nLagi semangat nge-gym? Saatnya upgrade progress dengan Personal Training! Dapatkan program yang disesuaikan dengan tujuanmu—lebih fokus, efektif, dan terarah.\n\nKhusus periode ini, tersedia penawaran spesial untuk paket sesi PT. Kuota terbatas.`,
        ctaText: "Lihat Promo PT",
        ctaPath: "/my-pt-sessions",
      }),
    },
    {
      id: "inactivity",
      label: "Ayo Aktif Kembali",
      build: () => ({
        subject: "Kami kangen — ayo kembali aktif!",
        message:
          `Halo ${fullName},\n\nKami perhatikan kamu belum sempat berkunjung belakangan ini. Yuk pelan-pelan kembali aktif—mulai dari kelas ringan atau sesi singkat pun tidak masalah.\n\nTim kami siap bantu kamu mulai lagi dengan nyaman dan aman.`,
        ctaText: "Lihat Kelas & Jadwal",
        ctaPath: "/",
      }),
    },
    {
      id: "feedback",
      label: "Minta Feedback / Testimoni",
      build: () => ({
        subject: "Bantu kami jadi lebih baik",
        message:
          `Halo ${fullName},\n\nKami ingin memastikan pengalamanmu di Idachi Fitness selalu menyenangkan dan bermanfaat. Boleh bantu kami dengan memberikan masukan singkat?\n\nMasukanmu sangat berarti untuk meningkatkan kualitas fasilitas, kelas, dan layanan kami. Terima kasih sebelumnya!`,
      }),
    },
  ];

  useEffect(() => {
    if (open && member) {
      // Default template on open if no selection
      const t = TEMPLATES[0]?.build();
      if (t) {
        setTemplate("welcome");
        setSubject(t.subject);
        setMessage(t.message);
        setCtaText(t.ctaText || "");
        setCtaUrl(t.ctaPath ? `${baseUrl}${t.ctaPath}` : "");
      }
    }
  }, [open, member, baseUrl]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("Member tidak ditemukan");
      return await apiRequest("POST", "/api/admin/email/send", {
        memberId: member.id,
        subject,
        message,
        ctaText: ctaText?.trim() || undefined,
        ctaUrl: ctaUrl?.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Terkirim", description: "Email berhasil dikirim" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Gagal", description: err?.message || "Gagal mengirim email", variant: "destructive" });
    }
  });

  const emailDisplay = member?.email || "-";
  const nameDisplay = `${member?.firstName || ""} ${member?.lastName || ""}`.trim() || member?.username || "Member";

  const disabled = !subject.trim() || !message.trim() || !member?.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Kirim Email ke Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-muted-foreground">Kepada</div>
            <div className="col-span-2 font-medium">{nameDisplay}</div>
            <div className="text-muted-foreground">Email</div>
            <div className="col-span-2">{emailDisplay}</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Template</label>
            <Select value={template} onValueChange={(val) => {
              setTemplate(val);
              const def = TEMPLATES.find(t => t.id === val)?.build();
              if (def) {
                setSubject(def.subject);
                setMessage(def.message);
                setCtaText(def.ctaText || "");
                setCtaUrl(def.ctaPath ? `${baseUrl}${def.ctaPath}` : "");
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih template (opsional)" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Judul email" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Pesan</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              placeholder="Tulis pesan email untuk member"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">CTA Button Text (Opsional)</label>
              <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Contoh: Lihat Promo" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">CTA Link URL (Opsional)</label>
              <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button className="gym-gradient text-white" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || disabled}>
              {sendMutation.isPending ? "Mengirim..." : "Kirim Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
