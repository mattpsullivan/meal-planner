// RecipePage component
// Full recipe detail view

import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container } from '@/components/layout/Container';
import { Skeleton } from '@/components/common/Skeleton';
import { RecipeDetail } from '@/components/recipe/RecipeDetail';
import { useRecipe } from '@/hooks/useRecipes';
import { routes } from '@/router';

export function RecipePage() {
  const { recipeId } = useParams<{ recipeId: string }>();
  const navigate = useNavigate();
  const recipeIdNum = recipeId ? parseInt(recipeId, 10) : 0;
  const { data: recipe, isLoading, error } = useRecipe(recipeIdNum);

  if (error != null) {
    return (
      <Container>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">Failed to load recipe: {error.message}</p>
        </div>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-24 w-24" />
            <Skeleton className="h-24 w-24" />
            <Skeleton className="h-24 w-24" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </Container>
    );
  }

  if (recipe == null) {
    return (
      <Container>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-700">Recipe not found.</p>
          <Link
            to={routes.home()}
            className="mt-4 inline-block text-green-600 hover:text-green-700"
          >
            Go back to week selection
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <RecipeDetail
        recipe={recipe}
        onBack={() => {
          void navigate(-1);
        }}
      />
    </Container>
  );
}
