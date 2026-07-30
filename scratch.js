const fs = require('fs'); 
const path = 'e:\\work\\Automation\\CRM\\crm uh\\crm-white\\app\\(dashboard)\\campaigns\\page.tsx'; 
let content = fs.readFileSync(path, 'utf8'); 
const replacements = [
  [/min-h-screen bg-slate-50\/50 dark:bg-slate-950 p-6 transition-colors/g, 'space-y-6'], 
  [/max-w-7xl mx-auto space-y-6/g, ''], 
  [/bg-white dark:bg-slate-900/g, 'bg-card'], 
  [/border-slate-200\/60 dark:border-slate-800/g, 'border-border'], 
  [/border-slate-200 dark:border-slate-800/g, 'border-border'], 
  [/border-slate-100 dark:border-slate-800/g, 'border-border'], 
  [/border-slate-100 dark:border-slate-700/g, 'border-border'], 
  [/bg-slate-50 dark:bg-slate-950/g, 'bg-background'], 
  [/bg-slate-50\/80 dark:bg-slate-900\/80/g, 'bg-muted/50'], 
  [/bg-slate-100 dark:bg-slate-800/g, 'bg-muted'], 
  [/bg-slate-50 dark:bg-slate-800/g, 'bg-muted'], 
  [/bg-slate-50\/50 dark:bg-slate-800\/50/g, 'bg-muted/50'], 
  [/bg-slate-50\/50 dark:bg-slate-900\/50/g, 'bg-muted/50'], 
  [/bg-slate-50\/30 dark:bg-slate-900\/30/g, 'bg-muted/30'], 
  [/hover:bg-slate-50\/50 dark:hover:bg-slate-800\/50/g, 'hover:bg-muted/50'], 
  [/hover:bg-slate-800 dark:hover:bg-slate-200/g, 'hover:bg-primary/90'], 
  [/bg-slate-900 dark:bg-slate-50/g, 'bg-primary'], 
  [/text-white dark:text-slate-900/g, 'text-primary-foreground'], 
  [/text-slate-900 dark:text-slate-50/g, 'text-foreground'], 
  [/text-slate-700 dark:text-slate-300/g, 'text-foreground'], 
  [/text-slate-500 dark:text-slate-400/g, 'text-muted-foreground'], 
  [/text-slate-400 dark:text-slate-500/g, 'text-muted-foreground'], 
  [/text-slate-300 dark:text-slate-600/g, 'text-muted-foreground'], 
  [/text-slate-600 dark:text-slate-300/g, 'text-muted-foreground'], 
  [/bg-indigo-600 dark:bg-indigo-500/g, 'bg-primary'], 
  [/hover:bg-indigo-700 dark:hover:bg-indigo-600/g, 'hover:bg-primary/90'], 
  [/bg-indigo-50 dark:bg-indigo-900\/30/g, 'bg-primary/10'], 
  [/text-indigo-700 dark:text-indigo-400/g, 'text-primary'], 
  [/text-indigo-600 dark:text-indigo-400/g, 'text-primary'], 
  [/hover:text-indigo-600 dark:hover:text-indigo-400/g, 'hover:text-primary'], 
  [/border-indigo-200\/50 dark:border-indigo-800\/50/g, 'border-primary/20'], 
  [/focus:ring-indigo-500\/20 focus:border-indigo-500/g, 'focus:ring-ring focus:border-ring'], 
  [/shadow-indigo-600\/20/g, 'shadow-sm'], 
  [/hover:shadow-indigo-600\/40/g, 'hover:shadow-md'], 
  [/hover:bg-indigo-100 dark:hover:bg-indigo-900\/50/g, 'hover:bg-primary/20'], 
  [/hover:bg-indigo-50 dark:hover:bg-indigo-900\/30/g, 'hover:bg-primary/10'], 
  [/bg-indigo-100 dark:bg-indigo-900\/30/g, 'bg-primary/20'], 
  [/rounded-2xl/g, 'rounded-xl'],
  [/bg-emerald-50 dark:bg-emerald-900\/30/g, 'bg-emerald-500/10'],
  [/text-emerald-700 dark:text-emerald-400/g, 'text-emerald-500'],
  [/border-emerald-200 dark:border-emerald-800/g, 'border-emerald-500/20'],
  [/bg-amber-50 dark:bg-amber-900\/30/g, 'bg-amber-500/10'],
  [/text-amber-700 dark:text-amber-400/g, 'text-amber-500'],
  [/border-amber-200 dark:border-amber-800/g, 'border-amber-500/20']
]; 
replacements.forEach(([search, replace]) => { 
  content = content.replace(search, replace); 
}); 
fs.writeFileSync(path, content, 'utf8'); 
console.log('Replaced successfully');
