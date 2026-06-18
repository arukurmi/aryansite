---
title: "AGI Timelines: The Continual Learning Bottleneck and Why Agents Aren't Ready"
excerpt: "AGI Timelines: The Continual Learning Bottleneck and Why Agents Aren't Ready"
date: "2025-12-17"
category: "engineering-lessons"
tags: ["agi", "ai", "future-of-ai"]
author: "Aryansh Kurmi"
---

A lot of people on the timeline are acting like AGI is dropping next Tuesday to replace us all. I recently watched Dwarkesh Patel's breakdown on transformative AI timelines, and honestly, it’s a much-needed reality check. He makes a solid architectural case for why transformative AI is going to take way longer than the hype suggests. 

Here is the *asli funda* behind the bottlenecks slowing down the AGI train, and what it actually means for those of us building AI-native systems.

### 1. The "Continual Learning" Panga
Right now, LLMs lack organic, continual learning. Think about how a human software engineer works: you deploy a bad commit, break the build, get feedback, and organically learn not to make that exact mistake again. You build context over time. Current models just don't do this natively. 

*Har baar naya prompt, har baar naya context window.* Recent research evaluating frontier AI systems in stateful environments (like the Continual Learning Bench) shows that models frequently overfit to immediate observations or completely fail to reuse knowledge across instances. Until AI can learn on the job without just re-reading the entire codebase in the context window every single time, fully autonomous workers are a distant dream.

### 2. Agents and Computer Use: Pure Jugaad Right Now 
There's massive noise about AI agents taking over computer workflows. Dwarkesh is incredibly skeptical about reliable agentic computer use in the short term, and from an engineering standpoint, he's right.

We simply don't have a massive pre-training corpus for multimodal, long-horizon computer tasks. Research into agents highlights that scaling up high-quality trajectory data remains a critical bottleneck. Clicking buttons, navigating dynamic UIs, and completing a 40-step workflow without hallucinating or losing state is brutally hard. Building agents right now often feels like stringing together brittle scripts. 

### 3. The Bright Side: "Baby AGI" Reasoning 
Despite the memory and statefulness bottlenecks, the recent progress in reasoning is insane. When you watch newer models plan out intermediate steps, it really does feel like a "baby general intelligence" is waking up. The core logic and planning engine is getting there, even if the autonomous execution isn't fully baked yet.

### The Timelines: When Does This Actually Click? 
If we are placing 50/50 bets based on these architectural constraints:
* **2028:** AI will finally nail end-to-end bounded tasks. Think managing small business taxes or running constrained backend migrations.
* **2032:** AI will actually learn on the job as seamlessly as a human for white-collar work.

**The Takeaway:** We are short-term bearish, but long-term incredibly bullish. The next couple of years will be an engineering grind to solve these fundamental data and memory bottlenecks. But once that continual learning piece clicks? We're looking at a full-blown intelligence explosion.