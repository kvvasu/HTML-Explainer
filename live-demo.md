---
template: sheet
theme: wada
title: Live demo — wada, aifig, annotations, callout
subtitle: The four additions in one page that opens offline
mode: auto
---

## A Hand-drawn annotation

The annot-css component draws a hand-drawn arrow and a handwritten note.

```annot-css ne amber
Open the [red valve]{before you drain the tank} before you remove the pump.
```

## B Diagram from ai-figure

The aifig component draws a figure from the ai-figure DSL. The colors come from the wada theme.

```aifig
figure flow
title: Sign-in path
direction: LR
start((Browser)) --> api[API server]
api --> db[Database]: query
```

## C Callout

The callout component shows a short note with a color.

```callout warn Caution
Close the valve before you remove the pump.
```
