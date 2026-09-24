import "./globals.css";

export const metadata = {
  title: "Product Admin Dashboard",
  description: "Manage products with DummyJSON",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
