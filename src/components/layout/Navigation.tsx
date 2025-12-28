// Navigation component
// Section tabs for switching between Plan, Shop, and Prep views

import { Container } from './Container';

export type NavigationSection = 'plan' | 'shop' | 'prep';

interface NavigationProps {
  activeSection: NavigationSection;
  onSectionChange: (section: NavigationSection) => void;
}

const sections: { id: NavigationSection; label: string; icon: React.ReactNode }[] = [
  {
    id: 'plan',
    label: 'Plan',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
      >
        <path
          fillRule="evenodd"
          d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    id: 'shop',
    label: 'Shop',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
      >
        <path
          fillRule="evenodd"
          d="M6 5v1H4.667a1.75 1.75 0 00-1.743 1.598l-.826 9.5A1.75 1.75 0 003.84 19H16.16a1.75 1.75 0 001.743-1.902l-.826-9.5A1.75 1.75 0 0015.333 6H14V5a4 4 0 00-8 0zm4-2.5A2.5 2.5 0 007.5 5v1h5V5A2.5 2.5 0 0010 2.5zM7.5 10a2.5 2.5 0 005 0V8.75a.75.75 0 011.5 0V10a4 4 0 01-8 0V8.75a.75.75 0 011.5 0V10z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    id: 'prep',
    label: 'Prep',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-5 w-5"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

export function Navigation({ activeSection, onSectionChange }: NavigationProps) {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <Container>
        <div className="flex justify-center gap-1 py-2 -mb-px">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                onSectionChange(section.id);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors sm:flex-none sm:gap-2 sm:px-4 ${
                section.id === activeSection
                  ? 'bg-green-50 text-green-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              aria-current={section.id === activeSection ? 'page' : undefined}
              title={section.label}
            >
              {section.icon}
              <span>{section.label}</span>
            </button>
          ))}
        </div>
      </Container>
    </nav>
  );
}
