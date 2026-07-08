import LogoutButton from './LogoutButton';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="flex items-center justify-between px-6 py-3 border-b bg-background">
        <span className="text-sm font-medium text-foreground">uReport NG — Staff</span>
        <LogoutButton />
      </nav>
      {children}
    </>
  );
}
