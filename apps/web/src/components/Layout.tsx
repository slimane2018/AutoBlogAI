import React from 'react';
import Nav from './Nav';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Nav />
      <main className="p-6 max-w-4xl mx-auto">{children}</main>
    </div>
  );
}
