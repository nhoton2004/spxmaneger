'use client';

import Sidebar from '@/components/Sidebar';
import AiOrderAssistant from '@/components/AiOrderAssistant';

export default function AiAssistantPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto min-h-screen">
        <AiOrderAssistant />
      </main>
    </div>
  );
}
