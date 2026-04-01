$filePath = "app/(tabs)/goals.tsx"
$content = Get-Content $filePath -Raw

# Replace the progress bar style
$oldPattern = "borderRadius: 8,`n                  `}`}"
$newPattern = "borderRadius: 8,`n                    shadowColor: '#FFD700',`n                    shadowOffset: { width: 0, height: 2 },`n                    shadowOpacity: 0.3,`n                    shadowRadius: 4,`n                    elevation: 3,`n                  `}`}"

# Only replace the one inside the progress bar (the width with `${goal.progress}%`)
$content = $content -replace "width: \`\`\$\{goal\.progress\}%\``,?\s+backgroundColor: '#FFD700',\s+borderRadius: 8,\s+\}\}\)", "width: `$""{goal.progress}%`"`,`n                    backgroundColor: '#FFD700',`n                    borderRadius: 8,`n                    shadowColor: '#FFD700',`n                    shadowOffset: { width: 0, height: 2 },`n                    shadowOpacity: 0.3,`n                    shadowRadius: 4,`n                    elevation: 3,`n                  }})"

Set-Content $filePath $content
Write-Host "Updated progress bar styling"
