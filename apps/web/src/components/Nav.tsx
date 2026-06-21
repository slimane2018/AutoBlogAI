import Link from 'next/link';
import React from 'react';

export default function Nav() {
  return (
    <nav className="p-4 border-b">
      <ul className="flex gap-4">
        <li>
          <Link href="/">Dashboard</Link>
        </li>
        <li>
          <Link href="/neuronwriter">NeuronWriter</Link>
        </li>
        <li>
          <Link href="/keywords/new">Add Keyword</Link>
        </li>
        <li>
          <Link href="/auth/signin">Sign In</Link>
        </li>
      </ul>
    </nav>
  );
}
