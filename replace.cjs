const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // accent -> secondary
  content = content.replace(/color="accent"/g, 'color="secondary"');
  content = content.replace(/color:\s*'accent'/g, "color: 'secondary'");
  content = content.replace(/color:\s*"accent"/g, 'color: "secondary"');
  content = content.replace(/color=\{'accent'\}/g, "color={'secondary'}");
  content = content.replace(/accent\.main/g, 'secondary.main');
  content = content.replace(/accent\.light/g, 'secondary.light');
  content = content.replace(/accent\.dark/g, 'secondary.dark');
  content = content.replace(/palette\.accent/g, 'palette.secondary');

  // specific bgcolors
  content = content.replace(
    /bgcolor:\s*['"]surface\.containerHigh['"]/g,
    "bgcolor: 'background.paper'",
  );
  content = content.replace(
    /bgcolor:\s*['"]surface\.containerHighest['"]/g,
    "bgcolor: 'background.paper'",
  );
  content = content.replace(
    /bgcolor:\s*['"]surface\.containerLowest['"]/g,
    "bgcolor: 'background.default'",
  );
  content = content.replace(
    /bgcolor:\s*['"]surface\.containerLow['"]/g,
    "bgcolor: 'background.default'",
  );
  content = content.replace(/bgcolor:\s*['"]surface\.bright['"]/g, "bgcolor: 'action.hover'");

  content = content.replace(
    /backgroundColor:\s*['"]surface\.containerHigh['"]/g,
    "backgroundColor: 'background.paper'",
  );
  content = content.replace(
    /backgroundColor:\s*['"]surface\.containerHighest['"]/g,
    "backgroundColor: 'background.paper'",
  );
  content = content.replace(
    /backgroundColor:\s*['"]surface\.containerLowest['"]/g,
    "backgroundColor: 'background.default'",
  );
  content = content.replace(
    /backgroundColor:\s*['"]surface\.containerLow['"]/g,
    "backgroundColor: 'background.default'",
  );
  content = content.replace(
    /backgroundColor:\s*['"]surface\.bright['"]/g,
    "backgroundColor: 'action.hover'",
  );

  content = content.replace(/surface\.containerHigh/g, 'background.paper');
  content = content.replace(/surface\.containerHighest/g, 'background.paper');
  content = content.replace(/surface\.containerLowest/g, 'background.default');
  content = content.replace(/surface\.containerLow/g, 'background.default');
  content = content.replace(/surface\.bright/g, 'action.hover');
  content = content.replace(/surface\?/g, 'background');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
