// Cheatsheet data: [section, [[description, command], …]]
export const SHEETS = {
  git: [
    ['Configure', [['Set your name / e-mail', 'git config --global user.name "Wem"\ngit config --global user.email "wem@example.org"'], ['Default branch name', 'git config --global init.defaultBranch main'], ['Show the effective config and where it comes from', 'git config --list --show-origin'], ['Rebase instead of merge on pull', 'git config --global pull.rebase true']]],
    ['Start', [['New repository here', 'git init'], ['Clone (with submodules)', 'git clone --recurse-submodules <url>'], ['Shallow clone (last commit only)', 'git clone --depth 1 <url>']]],
    ['Everyday', [['What changed?', 'git status -sb'], ['Stage everything / parts of a file', 'git add -A\ngit add -p <file>'], ['Commit', 'git commit -m "message"'], ['Fix the last commit (message or content)', 'git commit --amend'], ['Unstage a file', 'git restore --staged <file>'], ['Throw away local changes to a file', 'git restore <file>'], ['Remove untracked files (dry run first)', 'git clean -nd\ngit clean -fd']]],
    ['Branches', [['List / create / switch', 'git branch -a\ngit switch -c feature\ngit switch main'], ['Rename the current branch', 'git branch -m new-name'], ['Delete local / remote branch', 'git branch -d feature\ngit push origin --delete feature'], ['Merge a branch', 'git merge feature'], ['Rebase onto main', 'git rebase main'], ['Interactive rebase of the last 3 commits', 'git rebase -i HEAD~3']]],
    ['Remote', [['Show remotes', 'git remote -v'], ['Fetch everything, prune deleted branches', 'git fetch --all --prune'], ['Pull with rebase', 'git pull --rebase'], ['Push and track', 'git push -u origin main'], ['Force push safely', 'git push --force-with-lease']]],
    ['History', [['Compact graph', 'git log --oneline --graph --decorate --all'], ['Who changed each line', 'git blame <file>'], ['Changes of a commit', 'git show <sha>'], ['Search commits for a string', 'git log -S "password" --oneline'], ['Diff staged / against main', 'git diff --staged\ngit diff main...HEAD'], ['Find the commit that broke something', 'git bisect start\ngit bisect bad\ngit bisect good <sha>']]],
    ['Undo', [['Undo the last commit, keep the changes', 'git reset --soft HEAD~1'], ['Undo a pushed commit (new commit)', 'git revert <sha>'], ['Back to the remote state (loses local work)', 'git reset --hard origin/main'], ['Find "lost" commits', 'git reflog'], ['Recover a deleted branch', 'git branch recovered <sha-from-reflog>']]],
    ['Stash', [['Put changes aside (with untracked files)', 'git stash push -u -m "wip"'], ['List / apply / drop', 'git stash list\ngit stash pop\ngit stash drop']]],
    ['Tags', [['Annotated tag and push it', 'git tag -a v1.0 -m "v1.0"\ngit push origin v1.0'], ['List tags', 'git tag -l "v*"']]],
    ['Submodules', [['Add', 'git submodule add <url> themes/wem'], ['After cloning', 'git submodule update --init --recursive'], ['Update to the latest commit', 'git submodule update --remote themes/wem']]],
    ['Bundles & patches', [['Repository in one file', 'git bundle create repo.bundle --all'], ['Commits since a ref', 'git bundle create new.bundle main..feature'], ['Fetch from a bundle', 'git pull repo.bundle main'], ['Patch files and apply them', 'git format-patch -3\ngit am *.patch']]],
    ['Clean up secrets', [['A secret was committed: rotate it first, then rewrite history', 'git filter-repo --invert-paths --path secrets.env'], ['Ignore a file that is already tracked', 'git rm --cached <file>\necho <file> >> .gitignore']]],
  ],
  regex: [
    ['Characters', [['Any character except newline', '.'], ['Digit / not a digit', '\\d  \\D'], ['Word character [A-Za-z0-9_] / not', '\\w  \\W'], ['Whitespace / not', '\\s  \\S'], ['Escape a special character', '\\.  \\*  \\\\'], ['Tab, newline, carriage return', '\\t  \\n  \\r'], ['Unicode code point (u flag)', '\\u{1F600}'], ['Unicode property (u flag)', '\\p{L}  \\p{Lu}  \\p{N}']]],
    ['Sets', [['One of', '[abc]'], ['Not one of', '[^abc]'], ['Range', '[a-z0-9]'], ['Set with a literal dash or bracket', '[-\\]a]']]],
    ['Anchors', [['Start / end of input (or line with m)', '^  $'], ['Word boundary / not', '\\b  \\B']]],
    ['Quantifiers', [['0 or more / 1 or more / 0 or 1', '*  +  ?'], ['Exactly n / n or more / n to m', '{n}  {n,}  {n,m}'], ['Lazy (as few as possible)', '*?  +?  ??  {n,m}?']]],
    ['Groups', [['Capture group', '(abc)'], ['Non-capturing group', '(?:abc)'], ['Named group', '(?<year>\\d{4})'], ['Back-reference', '\\1  \\k<year>'], ['Alternation', 'cat|dog']]],
    ['Lookaround', [['Followed by / not followed by', 'x(?=y)  x(?!y)'], ['Preceded by / not preceded by', '(?<=y)x  (?<!y)x']]],
    ['Flags', [['global, ignore case, multiline', 'g  i  m'], ['dot matches newline, unicode, sticky', 's  u  y'], ['indices of groups, unicode sets', 'd  v']]],
    ['Replacement', [['Whole match / group n / named group', '$&  $1  $<year>'], ['Before / after the match, a literal $', "$`  $'  $$"]]],
    ['Useful patterns', [['IPv4 (loose)', '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b'], ['E-mail (practical)', '[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+'], ['ISO date', '\\d{4}-\\d{2}-\\d{2}'], ['Hex colour', '#(?:[0-9a-f]{3}){1,2}\\b'], ['UUID', '[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}'], ['Trim', '^\\s+|\\s+$'], ['Duplicate words', '\\b(\\w+)\\s+\\1\\b']]],
  ],
};
