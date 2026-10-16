#!/usr/bin/env bash
# design-better — the live design tokens, read from the stylesheet that defines them.
#
# The skill never carries a copy of the tokens: a copy is a second source of
# truth, and the day someone edits admin.css without editing the copy, the skill
# starts designing against a palette that no longer exists. This prints what
# the console actually ships, so a design brief quotes the real values.
#
# Usage, from anywhere inside the repository:
#   bash .claude/skills/design-better/scripts/tokens.sh          # everything
#   bash .claude/skills/design-better/scripts/tokens.sh color    # one section
#
# Sections: color · layout · type · components
set -u

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
CSS="$ROOT/resources/css/admin.css"
UI="$ROOT/resources/js/components/ui"
WANT=${1:-all}

[ -f "$CSS" ] || { echo "admin.css not found at $CSS" >&2; exit 1; }

section() { echo; echo "=== $1 ==="; }

if [ "$WANT" = all ] || [ "$WANT" = color ]; then
    section "color tokens (:root)"
    # Hex-valued custom properties in the root block only — the palette itself.
    awk '/^:root/{on=1} on && /--a-[a-z0-9-]+:[[:space:]]*#/{gsub(/^[[:space:]]+/,""); print} on && /^}/{exit}' "$CSS"
fi

if [ "$WANT" = all ] || [ "$WANT" = layout ]; then
    section "layout tokens (:root)"
    awk '/^:root/{on=1} on && /--a-[a-z0-9-]+:[[:space:]]*[0-9-]/{gsub(/^[[:space:]]+/,""); print} on && /^}/{exit}' "$CSS"
    section "layout tokens overridden by breakpoint"
    grep -n "^\s*--a-[a-z0-9-]*:" "$CSS" | awk -F: '$1 > 60' | sed 's/^\([0-9]*\):[[:space:]]*/line \1  /'
fi

if [ "$WANT" = all ] || [ "$WANT" = type ]; then
    section "type"
    grep -n "^\s*--font-" "$CSS" | sed 's/^\([0-9]*\):[[:space:]]*/line \1  /'
    grep -o "fonts.googleapis.com/css2?[^\"']*" "$ROOT/index.html" | head -1 | sed 's/%7C/|/g'
    section "type sizes in use (px, by frequency)"
    grep -o "font-size:[[:space:]]*[0-9.]*px" "$CSS" | grep -o "[0-9.]*px" | sort | uniq -c | sort -rn | head -14 | awk '{printf "  %s ×%s\n", $2, $1}'
fi

if [ "$WANT" = all ] || [ "$WANT" = components ]; then
    section "shared UI components ($(ls "$UI" | grep -c '\.vue$'))"
    ls "$UI" | grep '\.vue$' | sed 's/\.vue$//' | tr '\n' ' '; echo
    section "shared class families (.a-*), top 40 by rule count"
    grep -o "^\.a-[a-z0-9]*" "$CSS" | sort | uniq -c | sort -rn | head -40 | awk '{printf "  %-16s %s\n", $2, $1}'
    section "stylesheet size"
    wc -l "$CSS" | awk '{print "  " $1 " lines"}'
fi
