"""UI audit — find broken imports, unused exports, dead code."""
import re
from pathlib import Path

ROOT = Path("/opt/data/anamata-kahui")
SRC = ROOT / "src"

# Collect all .tsx and .ts files (excluding tests, node_modules, .next)
files = []
for f in SRC.rglob("*.tsx"):
    if any(p in str(f) for p in [".next", "node_modules", ".test."]):
        continue
    files.append(f)

# Find all imports
imports: dict[str, set[Path]] = {}
for f in files:
    text = f.read_text(errors="replace")
    for m in re.finditer(
        r'import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+["\']([^"\']+)["\']',
        text,
    ):
        names_raw = m.group(1) or m.group(2)
        for n in names_raw.split(","):
            n = n.strip().split(" as ")[0].strip()
            if n:
                imports.setdefault(n, set()).add(f.relative_to(ROOT))

# Find all exports (named exports only, not default)
exports: dict[str, Path] = {}
for f in files:
    text = f.read_text(errors="replace")
    for m in re.finditer(r"export\s+(?:function|const|class)\s+(\w+)", text):
        if m.group(1) not in exports:
            exports[m.group(1)] = f.relative_to(ROOT)

# Find imports that don't resolve to a local export
NEXT_REACT_DEFAULT_EXPORTS = {
    "React",
    "Component",
    "Fragment",
    "Suspense",
    "use",
    "useState",
    "useEffect",
    "useTransition",
    "useActionState",
    "useFormStatus",
    "useFormState",
    "useDeferredValue",
    "useId",
    "useMemo",
    "useCallback",
    "useRef",
    "useContext",
    "useLayoutEffect",
    "useReducer",
    "useImperativeHandle",
    "useInsertionEffect",
}

missing_imports = []
for name, files_using in sorted(imports.items()):
    if name in NEXT_REACT_DEFAULT_EXPORTS:
        continue
    if name in exports:
        continue
    # Some imports come from external packages — we can't see those exports
    # locally. Just list everything that's used but not exported, as candidates.
    missing_imports.append((name, sorted([str(f) for f in files_using])))

print(f"Files analysed: {len(files)}")
print(f"Unique imports: {len(imports)}")
print(f"Unique exports: {len(exports)}")
print()
print("=== Imports without local matches (may be external libs) ===")
print(f"Count: {len(missing_imports)}")
print()

# Filter to those that look like they're meant to be local
suspicious = [
    (n, files) for n, files in missing_imports
    if (files and (files[0].startswith("src/components/") or files[0].startswith("src/lib/")
        or files[0].startswith("src/app/")))
]
for n, files in suspicious[:30]:
    print(f"  {n}")
    for f in files[:2]:
        print(f"    {f}")
    print()

# Unused exports
unused = sorted(
    [
        (name, str(f))
        for name, f in exports.items()
        if name not in imports and not name.startswith("use") and name[0].isupper() is False
    ]
)
print()
print(f"=== Unused exports (excluding hooks/uppercase = components) ===")
print(f"Count: {len(unused)}")
for name, f in unused[:30]:
    print(f"  {name} -> {f}")