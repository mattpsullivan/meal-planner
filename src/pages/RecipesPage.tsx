// RecipesPage component
// Browse all recipes with search and diet filtering.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '@/components/layout/Container';
import { RecipeCardGrid } from '@/components/recipe/RecipeCard';
import { Skeleton } from '@/components/common/Skeleton';
import { useRecipes } from '@/hooks/useRecipes';
import { DIETS, DIET_LABELS } from '@/lib/diet';
import type { Diet, Recipe } from '@/types';
import { routes } from '@/router';

export function RecipesPage() {
  const { data: recipes = [], isLoading, error } = useRecipes();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selectedDiets, setSelectedDiets] = useState<Set<Diet>>(() => new Set<Diet>());

  const toggleDiet = (diet: Diet) => {
    setSelectedDiets((prev) => {
      const next = new Set(prev);
      if (next.has(diet)) {
        next.delete(diet);
      } else {
        next.add(diet);
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return recipes.filter((recipe) => {
      const matchesSearch = query === '' || recipe.name.toLowerCase().includes(query);
      const matchesDiet =
        selectedDiets.size === 0 || (recipe.diet != null && selectedDiets.has(recipe.diet));
      return matchesSearch && matchesDiet;
    });
  }, [recipes, search, selectedDiets]);

  if (error != null) {
    return (
      <Container>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">Failed to load recipes: {error.message}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
          <p className="mt-1 text-gray-600">Browse and filter every recipe in your library.</p>
        </div>

        {/* Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          placeholder="Search recipes by name…"
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />

        {/* Diet filter chips */}
        <div className="flex flex-wrap gap-2">
          {DIETS.map((diet) => {
            const active = selectedDiets.has(diet);
            return (
              <button
                key={diet}
                type="button"
                onClick={() => {
                  toggleDiet(diet);
                }}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  active
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {DIET_LABELS[diet]}
              </button>
            );
          })}
          {selectedDiets.size > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedDiets(new Set<Diet>());
              }}
              className="rounded-full px-3 py-1 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              {filtered.length} {filtered.length === 1 ? 'recipe' : 'recipes'}
            </p>
            <RecipeCardGrid
              recipes={filtered}
              onRecipeClick={(recipe: Recipe) => {
                void navigate(routes.recipe(recipe.id));
              }}
              emptyMessage="No recipes match your filters"
            />
          </>
        )}
      </div>
    </Container>
  );
}
