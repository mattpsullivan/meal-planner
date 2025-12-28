// NotFoundPage component
// 404 error page

import { Link } from 'react-router-dom';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/common/Button';
import { routes } from '@/router';

export function NotFoundPage() {
  return (
    <Container>
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <h1 className="mb-4 text-6xl font-bold text-gray-300">404</h1>
        <h2 className="mb-2 text-2xl font-semibold text-gray-900">Page Not Found</h2>
        <p className="mb-8 max-w-md text-gray-600">
          The page you're looking for doesn't exist. It might have been moved or you may have
          mistyped the URL.
        </p>
        <Link to={routes.home()}>
          <Button variant="primary">
            <HomeIcon className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </Link>
      </div>
    </Container>
  );
}

// Icon
function HomeIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z"
        clipRule="evenodd"
      />
    </svg>
  );
}
