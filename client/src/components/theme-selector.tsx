import { THEME_LIST, useTheme } from '@client/src/themes';
import ThemePreviewCard from './theme-preview-card';

const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {THEME_LIST.map((t) => (
        <ThemePreviewCard
          key={t.key}
          theme={t}
          active={theme === t.key}
          onClick={() => setTheme(t.key)}
        />
      ))}
    </div>
  );
};

export default ThemeSelector;
