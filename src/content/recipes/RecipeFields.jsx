import FormField from '../../components/forms/FormField';
import { Input } from '../../components/ui/input';
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select';
import { Textarea } from '../../components/ui/textarea';

export default function RecipeFields({ ingredients, instructions, onIngredientsChange, onInstructionsChange }) {
	return (
		<fieldset className="grid gap-4">
			<legend className="text-2xl font-semibold">Recipe</legend>
			<FormField label="Ingredients" name="ingredients" description="One ingredient per line: quantity | unit | name">
				<Textarea
					id="ingredients"
					name="ingredients"
					required
					placeholder={'250 | g | farinha\n100 | g | manteiga'}
					value={ingredients}
					onChange={onIngredientsChange}
				/>
			</FormField>
			<FormField label="Instructions" name="instructions" description="One instruction per line.">
				<Textarea
					id="instructions"
					name="instructions"
					required
					placeholder={'Misture os ingredientes.\nLeve ao forno.'}
					value={instructions}
					onChange={onInstructionsChange}
				/>
			</FormField>
			<FormField label="Preparation minutes" name="prepMinutes">
				<Input id="prepMinutes" name="prepMinutes" type="number" min="0" required />
			</FormField>
			<FormField label="Cooking minutes" name="cookMinutes">
				<Input id="cookMinutes" name="cookMinutes" type="number" min="0" required />
			</FormField>
			<FormField label="Difficulty" name="difficulty">
				<NativeSelect id="difficulty" name="difficulty" defaultValue="easy">
					<NativeSelectOption value="easy">Easy</NativeSelectOption>
					<NativeSelectOption value="medium">Medium</NativeSelectOption>
					<NativeSelectOption value="hard">Hard</NativeSelectOption>
				</NativeSelect>
			</FormField>
			<FormField label="Yield quantity" name="yieldQuantity">
				<Input id="yieldQuantity" name="yieldQuantity" type="number" min="0.01" step="any" required />
			</FormField>
			<FormField label="Yield unit" name="yieldUnit">
				<Input id="yieldUnit" name="yieldUnit" required maxLength={200} />
			</FormField>
		</fieldset>
	);
}
