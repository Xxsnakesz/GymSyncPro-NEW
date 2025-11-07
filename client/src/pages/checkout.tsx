export default function Checkout() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-xl font-bold">Payment Disabled</h1>
        <p className="text-sm text-muted-foreground">
          Pembayaran melalui payment gateway telah dinonaktifkan. Jika Anda ingin memperpanjang membership, silakan hubungi admin.
        </p>
      </div>
    </div>
  );
}
