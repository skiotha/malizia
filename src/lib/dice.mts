export function parseDice(expression: string): DiceGroup[] {
  const dicePattern = /(\d*)d(\d+)([+-]\d+)?/g;
  const groups: DiceGroup[] = [];
  let match;

  while ((match = dicePattern.exec(expression)) !== null) {
    const [, count, sides, modifier] = match;
    groups.push({
      count: parseInt(count ?? "1") || 1,
      sides: parseInt(sides ?? "0"),
      modifier: parseInt(modifier ?? "0"),
    });
  }

  return groups;
}

export function rollDice(group: DiceGroup): RollResult {
  const rolls: number[] = [];
  for (let i = 0; i < group.count; i++) {
    rolls.push(Math.floor(Math.random() * group.sides) + 1);
  }
  const total = rolls.reduce((sum, r) => sum + r, 0) + group.modifier;
  return { rolls, modifier: group.modifier, total };
}

export interface DiceGroup {
  count: number;
  sides: number;
  modifier: number;
}

export interface RollResult {
  rolls: number[];
  modifier: number;
  total: number;
}
