import { HelpCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavUserHeader } from '@/components/nav-user-header';
import Breadcrumb from '@/components/breadcrumb';
import { NotificationsButton } from '@/components/notifications-button';

export default function Header() {
  return (
    <header className="h-[64px] bg-white border-b flex items-center justify-between px-[32px]">
        <div className="hidden md:flex items-center">
          <Breadcrumb />
        </div>
        <div className="flex items-center space-x-4">
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="p-2 rounded-full bg-gray-100">
                  <HelpCircle className="size-5 text-gray-500" />
                </Button>
                <NotificationsButton />
                <Button variant="ghost" size="icon" className="p-2 rounded-full bg-gray-100">
                  <MessageCircle className="size-5 text-gray-500" />
                </Button>
            </div>
            <NavUserHeader />
        </div>
    </header>
  );
}
