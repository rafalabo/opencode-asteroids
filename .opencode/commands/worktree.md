---
description: Crea un git worktree en .worktrees/<nombre>
---

Crea un git worktree a nivel local. Recibes el nombre como argumento: $ARGUMENTS.

Reglas estrictas:
1. Si el argumento está vacío, aborta con el error `Falta el nombre: usa /worktree <nombre-sin-espacios>` y no ejecutes nada más.
2. Normaliza el nombre: recorta espacios, pásalo a minúsculas, reemplaza cada espacio por un guion, colapsa guiones repetidos y elimina cualquier carácter fuera de `[a-z0-9-]`. Si el resultado queda vacío, aborta con error y no ejecutes nada.
3. Ejecuta exactamente `git worktree add .worktrees/<nombre-normalizado>` desde la raíz del proyecto.
4. No te cambies de directorio. No ejecutes ningún comando adicional. Simplemente ejecuta el comando de creación del worktree y reporta su salida tal cual.
