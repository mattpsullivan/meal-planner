// Footer component
// App footer with attribution

import { Container } from './Container';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 py-4">
      <Container>
        <div className="flex flex-col items-center justify-between gap-2 text-sm text-gray-500 sm:flex-row">
          <p>Meal planning made simple</p>
          <p>Built with love for healthy eating</p>
        </div>
      </Container>
    </footer>
  );
}
