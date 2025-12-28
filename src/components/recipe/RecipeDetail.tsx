// RecipeDetail component
// Full recipe view with ingredients, instructions, and scaling

import { useState, useCallback } from 'react';
import type { RecipeWithDetails } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { IngredientList } from './IngredientList';
import { ServingScaler } from './ServingScaler';

interface RecipeDetailProps {
  recipe: RecipeWithDetails;
  onBack?: (() => void) | undefined;
}

export function RecipeDetail({ recipe, onBack }: RecipeDetailProps) {
  const [servings, setServings] = useState(recipe.servings);
  const scale = servings / recipe.servings;

  const totalTime = recipe.totalTime ?? (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);

  return (
    <div className="space-y-6">
      {/* Back button */}
      {onBack != null && (
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon className="h-4 w-4" />
          Back to recipes
        </Button>
      )}

      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{recipe.name}</h1>
          <div className="flex gap-2">
            {recipe.recipeType === 'meal' && <Badge variant="green">Meal Assembly</Badge>}
            {recipe.recipeType === 'component' && <Badge variant="default">Component</Badge>}
            {recipe.cuisine != null && <Badge variant="default">{recipe.cuisine}</Badge>}
          </div>
        </div>
        {recipe.description != null && <p className="mt-2 text-gray-600">{recipe.description}</p>}
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        {recipe.prepTime != null && (
          <MetaItem icon={<ClockIcon />} label="Prep" value={`${String(recipe.prepTime)} min`} />
        )}
        {recipe.cookTime != null && (
          <MetaItem icon={<ClockIcon />} label="Cook" value={`${String(recipe.cookTime)} min`} />
        )}
        {totalTime > 0 && (
          <MetaItem icon={<ClockIcon />} label="Total" value={`${String(totalTime)} min`} />
        )}
        <MetaItem icon={<UsersIcon />} label="Base servings" value={String(recipe.servings)} />
      </div>

      {/* Serving scaler */}
      <Card padding="md">
        <ServingScaler
          baseServings={recipe.servings}
          currentServings={servings}
          onChange={setServings}
        />
      </Card>

      {/* Ingredients */}
      <Card>
        <CardHeader>
          <CardTitle>
            {recipe.recipeType === 'meal' ? 'Components & Ingredients' : 'Ingredients'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {recipe.recipeType === 'meal' && (
            <p className="mb-4 text-sm text-gray-500">
              Blue items are pre-made components — click to view their recipes.
            </p>
          )}
          <IngredientList ingredients={recipe.ingredients} scale={scale} />
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>
            {recipe.recipeType === 'meal' ? 'Assembly Instructions' : 'Instructions'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <InstructionSteps instructions={recipe.instructions} />
        </CardContent>
      </Card>

      {/* Tags */}
      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="green">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Notes */}
      {recipe.notes != null && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{recipe.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Instruction steps display
interface InstructionStepsProps {
  instructions: RecipeWithDetails['instructions'];
}

function InstructionSteps({ instructions }: InstructionStepsProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const toggleStep = useCallback((stepId: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);

  if (instructions.length === 0) {
    return <p className="text-sm text-gray-500">No instructions available.</p>;
  }

  return (
    <ol className="space-y-4">
      {instructions.map((instruction, index) => {
        const isCompleted = completedSteps.has(instruction.id);

        return (
          <li key={instruction.id} className="flex gap-4">
            <button
              onClick={() => {
                toggleStep(instruction.id);
              }}
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                isCompleted
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isCompleted ? <CheckIcon className="h-4 w-4" /> : index + 1}
            </button>
            <div className="flex-1 pt-1">
              <p
                className={`text-sm ${
                  isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'
                }`}
              >
                {instruction.text}
              </p>
              {instruction.duration != null && (
                <p className="mt-1 text-xs text-gray-500">Duration: {instruction.duration} min</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// Meta item helper
function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

// Icons
function ArrowLeftIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}
