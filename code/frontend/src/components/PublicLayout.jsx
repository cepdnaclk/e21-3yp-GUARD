import { Outlet } from 'react-router-dom';
import PublicNav from './PublicNav';

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}
