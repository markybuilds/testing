# Claude 4 prompt engineering best practices

This guide provides specific prompt engineering techniques for Claude 4 models (Opus 4 and Sonnet 4) to help you achieve optimal results in your applications. These models have been trained for more precise instruction following than previous generations of Claude models.

## General principles

### Be explicit with your instructions

Claude 4 models respond well to clear, explicit instructions. Being specific about your desired output can help enhance results. Customers who desire the "above and beyond" behavior from previous Claude models might need to more explicitly request these behaviors with Claude 4.

<Accordion title="Example: Creating an analytics dashboard">
  **Less effective:**

  ```text
  Create an analytics dashboard
  ```

  **More effective:**

  ```text
  Create an analytics dashboard. Include as many relevant features and interactions as possible. Go beyond the basics to create a fully-featured implementation.
  ```
</Accordion>

### Add context to improve performance

Providing context or motivation behind your instructions, such as explaining to Claude why such behavior is important, can help Claude 4 better understand your goals and deliver more targeted responses.

<Accordion title="Example: Formatting preferences">
  **Less effective:**

  ```text
  NEVER use ellipses
  ```

  **More effective:**

  ```text
  Your response will be read aloud by a text-to-speech engine, so never use ellipses since the text-to-speech engine will not know how to pronounce them.
  ```
</Accordion>

Claude is smart enough to generalize from the explanation.

### Be vigilant with examples & details

Claude 4 models pay attention to details and examples as part of instruction following. Ensure that your examples align with the behaviors you want to encourage and minimize behaviors you want to avoid.

## Guidance for specific situations

### Control the format of responses

There are a few ways that we have found to be particularly effective in steering output formatting in Claude 4 models:

1. **Tell Claude what to do instead of what not to do**

   * Instead of: "Do not use markdown in your response"
   * Try: "Your response should be composed of smoothly flowing prose paragraphs."

2. **Use XML format indicators**

   * Try: "Write the prose sections of your response in \<smoothly\_flowing\_prose\_paragraphs> tags."

3. **Match your prompt style to the desired output**

   The formatting style used in your prompt may influence Claude's response style. If you are still experiencing steerability issues with output formatting, we recommend as best as you can matching your prompt style to your desired output style. For example, removing markdown from your prompt can reduce the volume of markdown in the output.

### Leverage thinking & interleaved thinking capabilities

Claude 4 offers thinking capabilities that can be especially helpful for tasks involving reflection after tool use or complex multi-step reasoning. You can guide its initial or interleaved thinking for better results.

```text Example prompt
After receiving tool results, carefully reflect on their quality and determine optimal next steps before proceeding. Use your thinking to plan and iterate based on this new information, and then take the best next action.
```

<Info>
  For more information on thinking capabilities, see [Extended thinking](/en/docs/build-with-claude/extended-thinking).
</Info>

### Optimize parallel tool calling

Claude 4 models excel at parallel tool execution. They have a high success rate in using parallel tool calling without any prompting to do so, but some minor prompting can boost this behavior to \~100% parallel tool use success rate. We have found this prompt to be most effective:

```text Sample prompt for agents
For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially.
```

### Reduce file creation in agentic coding

Claude 4 models may sometimes create new files for testing and iteration purposes, particularly when working with code. This approach allows Claude to use files, especially python scripts, as a 'temporary scratchpad' before saving its final output. Using temporary files can improve outcomes particularly for agentic coding use cases.

If you'd prefer to minimize net new file creation, you can instruct Claude to clean up after itself:

```text Sample prompt
If you create any temporary new files, scripts, or helper files for iteration, clean up these files by removing them at the end of the task.
```

### Enhance visual and frontend code generation

For frontend code generation, you can steer Claude 4 models to create complex, detailed, and interactive designs by providing explicit encouragement:

```text Sample prompt
Don't hold back. Give it your all.
```

You can also improve Claude's frontend performance in specific areas by providing additional modifiers and details on what to focus on:

* "Include as many relevant features and interactions as possible"
* "Add thoughtful details like hover states, transitions, and micro-interactions"
* "Create an impressive demonstration showcasing web development capabilities"
* "Apply design principles: hierarchy, contrast, balance, and movement"

### Avoid focusing on passing tests and hard-coding

Frontier language models can sometimes focus too heavily on making tests pass at the expense of more general solutions. To prevent this behavior and ensure robust, generalizable solutions:

```text Sample prompt
Please write a high quality, general purpose solution. Implement a solution that works correctly for all valid inputs, not just the test cases. Do not hard-code values or create solutions that only work for specific test inputs. Instead, implement the actual logic that solves the problem generally.

Focus on understanding the problem requirements and implementing the correct algorithm. Tests are there to verify correctness, not to define the solution. Provide a principled implementation that follows best practices and software design principles.

If the task is unreasonable or infeasible, or if any of the tests are incorrect, please tell me. The solution should be robust, maintainable, and extendable.
```

## Migration considerations

When migrating from Sonnet 3.7 to Claude 4:

1. **Be specific about desired behavior**: Consider describing exactly what you'd like to see in the output.

2. **Frame your instructions with modifiers**: Adding modifiers that encourage Claude to increase the quality and detail of its output can help better shape Claude's performance. For example, instead of "Create an analytics dashboard", use "Create an analytics dashboard. Include as many relevant features and interactions as possible. Go beyond the basics to create a fully-featured implementation."

3. **Request specific features explicitly**: Animations and interactive elements should be requested explicitly when desired.

# Be clear, direct, and detailed

<Note>
  While these tips apply broadly to all Claude models, you can find prompting tips specific to extended thinking models [here](/en/docs/build-with-claude/prompt-engineering/extended-thinking-tips).
</Note>

When interacting with Claude, think of it as a brilliant but very new employee (with amnesia) who needs explicit instructions. Like any new employee, Claude does not have context on your norms, styles, guidelines, or preferred ways of working.
The more precisely you explain what you want, the better Claude's response will be.

<Tip>**The golden rule of clear prompting**<br />Show your prompt to a colleague, ideally someone who has minimal context on the task, and ask them to follow the instructions. If they're confused, Claude will likely be too.</Tip>

## How to be clear, contextual, and specific

* **Give Claude contextual information:** Just like you might be able to better perform on a task if you knew more context, Claude will perform better if it has more contextual information. Some examples of contextual information:
  * What the task results will be used for
  * What audience the output is meant for
  * What workflow the task is a part of, and where this task belongs in that workflow
  * The end goal of the task, or what a successful task completion looks like
* **Be specific about what you want Claude to do:** For example, if you want Claude to output only code and nothing else, say so.
* **Provide instructions as sequential steps:** Use numbered lists or bullet points to better ensure that Claude carries out the task the exact way you want it to.

### Examples

<AccordionGroup>
  <Accordion title="Example: Anonymizing customer feedback">
    Notice that Claude still makes mistakes in the unclear prompting example, such as leaving in a customer's name.

    | Role                          | Unclear Prompt                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Clear Prompt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
    | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
    | User                          | Please remove all personally identifiable information from these customer feedback messages: \{\{FEEDBACK\_DATA}}                                                                                                                                                                                                                                                                                                                                                     | Your task is to anonymize customer feedback for our quarterly review.<br /><br />Instructions:<br />1. Replace all customer names with "CUSTOMER\_\[ID]" (e.g., "Jane Doe" → "CUSTOMER\_001").<br />2. Replace email addresses with "EMAIL\_\[ID]@example.com".<br />3. Redact phone numbers as "PHONE\_\[ID]".<br />4. If a message mentions a specific product (e.g., "AcmeCloud"), leave it intact.<br />5. If no PII is found, copy the message verbatim.<br />6. Output only the processed messages, separated by "---".<br /><br />Data to process: \{\{FEEDBACK\_DATA}} |
    | Assistant (Claude's response) | Here are the anonymized customer feedback messages:<br />1. I've been using your software for years, and it's been great. But lately, AcmeCloud has been crashing a lot. Fix it!<br />2. XXX, your customer support rep, was incredibly helpful. He guided me through the whole process. My email is XXX if you want to send a survey.<br />3. I'm John Smith, and I'm not happy. I've been on hold for 2 hours trying to reach someone at XXX. This is unacceptable! | CUSTOMER\_001: I've been using your software for years, and it's been great. But lately, AcmeCloud has been crashing a lot. Fix it!<br />---<br />CUSTOMER\_002: CUSTOMER\_SERVICE\_001, your customer support rep, was incredibly helpful. He guided me through the whole process. My email is [EMAIL\_002@example.com](mailto:EMAIL_002@example.com) if you want to send a survey.<br />---<br />CUSTOMER\_003: I'm CUSTOMER\_003, and I'm not happy. I've been on hold for 2 hours trying to reach someone at PHONE\_001. This is unacceptable!                             |
  </Accordion>

  <Accordion title="Example: Crafting a marketing email campaign">
    Notice that Claude makes up details to fill in the gaps where it lacks context with the vague prompt.

    | Role                          | Vague Prompt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Specific Prompt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
    | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | User                          | Write a marketing email for our new AcmeCloud features.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Your task is to craft a targeted marketing email for our Q3 AcmeCloud feature release.<br /><br />Instructions:<br />1. Write for this target audience: Mid-size tech companies (100-500 employees) upgrading from on-prem to cloud.<br />2. Highlight 3 key new features: advanced data encryption, cross-platform sync, and real-time collaboration.<br />3. Tone: Professional yet approachable. Emphasize security, efficiency, and teamwork.<br />4. Include a clear CTA: Free 30-day trial with priority onboarding.<br />5. Subject line: Under 50 chars, mention "security" and "collaboration".<br />6. Personalization: Use \{\{COMPANY\_NAME}} and \{\{CONTACT\_NAME}} variables.<br /><br />Structure:<br />1. Subject line<br />2. Email body (150-200 words)<br />3. CTA button text                                                                                                                                                                                                                                                                                                                                                        |
    | Assistant (Claude's response) | Here's a draft marketing email for our new features:<br /><br />Subject: Boost Your Business with AcmeCloud's Latest Features<br /><br />Dear Valued Customer,<br /><br />We're excited to introduce three powerful features to AcmeCloud that will revolutionize your workflow:<br /><br />1. Real-Time Collaboration: Work on documents simultaneously with your team. No more version control issues!<br />2. AI-Powered Insights: Make data-driven decisions with AI that analyzes trends and automates tasks.<br />3. Advanced Security Suite: End-to-end encryption, multi-factor auth, and threat detection keep your data safe.<br /><br />Limited Offer: Upgrade now for a 20% first-year discount. Plus, refer a friend for an extra 10% off!<br /><br />Best,<br />The AcmeCloud Team | Subject line: AcmeCloud: Enterprise security meets real-time teamwork<br /><br />Email body:<br />Dear \{\{CONTACT\_NAME}},<br /><br />At \{\{COMPANY\_NAME}}, you're scaling fast and eyeing the cloud. But with growth comes the challenge of keeping data secure while fostering collaboration. That's where AcmeCloud's Q3 release comes in, tailor-made for tech innovators like you.<br /><br />1. Fort Knox for Your Files: Military-grade encryption now safeguards your data, both in motion and at rest. Your intellectual property stays yours, period.<br />2. Sync Without Borders: Windows, Mac, or Linux—AcmeCloud speaks all languages. Unified version control means no more "final\_v2\_REALLY\_FINAL.doc".<br />3. Collaborate at Light Speed: Ditch the attachment ping-pong. Now your devs, designers, and data scientists co-create in real-time, slashing time-to-market.<br /><br />Don't just take our word for it. Experience the AcmeCloud difference with our 30-day trial. And because we know time is your most precious asset, we're throwing in priority onboarding.<br /><br />Elevate Your Team Now - Free 30-Day Trial |
  </Accordion>

  <Accordion title="Example: Incident response">
    Notice that Claude outputs superfluous text and different formating with the vague prompt.

    | Role                          | Vague Prompt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Detailed Prompt                                                                                                                                                                                                                                                                                                         |
    | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | User                          | Analyze this AcmeCloud outage report and summarize the key points.<br /><br />\{\{REPORT}}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Analyze this AcmeCloud outage report. Skip the preamble. Keep your response terse and write only the bare bones necessary information. List only:<br />1) Cause<br />2) Duration<br />3) Impacted services<br />4) Number of affected users<br />5) Estimated revenue loss. <br /><br />Here's the report: \{\{REPORT}} |
    | Assistant (Claude's response) | Here's a summary of the key points from the AcmeCloud outage report:<br /><br />On May 15th, a misconfigured load balancer update caused significant traffic routing issues, resulting in a service outage from 09:15 to 13:52 UTC. The 4-hour 37-minute disruption impacted our core file syncing service and admin dashboard, rendering them inaccessible. Additionally, the mobile app experienced partial functionality loss. Approximately 68% of our user base, totaling 1.3 million users, were affected. Based on our Service Level Agreements (SLAs) and average revenue per user, we estimate a financial impact of \$420,000 in service credits and potential customer churn. | 1) Cause: Misconfigured load balancer update<br />2) Duration: 4h 37m (09:15-13:52 UTC, May 15)<br />3) Impacted: Core sync, admin dashboard (down); mobile app (partial)<br />4) Affected users: 1.3M (68% of base)<br />5) Est. revenue loss: \$420,000                                                               |
  </Accordion>
</AccordionGroup>

***

<CardGroup cols={3}>
  <Card title="Prompt library" icon="link" href="/en/resources/prompt-library/library">
    Get inspired by a curated selection of prompts for various tasks and use cases.
  </Card>

  <Card title="GitHub prompting tutorial" icon="link" href="https://github.com/anthropics/prompt-eng-interactive-tutorial">
    An example-filled tutorial that covers the prompt engineering concepts found in our docs.
  </Card>

  <Card title="Google Sheets prompting tutorial" icon="link" href="https://docs.google.com/spreadsheets/d/19jzLgRruG9kjUQNKtCg1ZjdD6l6weA6qRXG5zLIAhC8">
    A lighter weight version of our prompt engineering tutorial via an interactive spreadsheet.
  </Card>
</CardGroup>


# Use XML tags to structure your prompts

<Note>
  While these tips apply broadly to all Claude models, you can find prompting tips specific to extended thinking models [here](/en/docs/build-with-claude/prompt-engineering/extended-thinking-tips).
</Note>

When your prompts involve multiple components like context, instructions, and examples, XML tags can be a game-changer. They help Claude parse your prompts more accurately, leading to higher-quality outputs.

<Tip>**XML tip**: Use tags like `<instructions>`, `<example>`, and `<formatting>` to clearly separate different parts of your prompt. This prevents Claude from mixing up instructions with examples or context.</Tip>

## Why use XML tags?

* **Clarity:** Clearly separate different parts of your prompt and ensure your prompt is well structured.
* **Accuracy:** Reduce errors caused by Claude misinterpreting parts of your prompt.
* **Flexibility:** Easily find, add, remove, or modify parts of your prompt without rewriting everything.
* **Parseability:** Having Claude use XML tags in its output makes it easier to extract specific parts of its response by post-processing.

<Note>There are no canonical "best" XML tags that Claude has been trained with in particular, although we recommend that your tag names make sense with the information they surround.</Note>

***

## Tagging best practices

1. **Be consistent**: Use the same tag names throughout your prompts, and refer to those tag names when talking about the content (e.g, `Using the contract in <contract> tags...`).
2. **Nest tags**: You should nest tags `<outer><inner></inner></outer>` for hierarchical content.

<Tip>**Power user tip**: Combine XML tags with other techniques like multishot prompting (`<examples>`) or chain of thought (`<thinking>`, `<answer>`). This creates super-structured, high-performance prompts.</Tip>

### Examples

<AccordionGroup>
  <Accordion title="Example: Generating financial reports">
    Without XML tags, Claude misunderstands the task and generates a report that doesn't match the required structure or tone. After substitution, there is also a chance that Claude misunderstands where one section (like the the Q1 report example) stops and another begins.

    | Role      | No XML Tags                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | With XML Tags                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
    | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | User      | You're a financial analyst at AcmeCorp. Generate a Q2 financial report for our investors. Include sections on Revenue Growth, Profit Margins, and Cash Flow, like with this example from last year: \{\{Q1\_REPORT}}. Use data points from this spreadsheet: \{\{SPREADSHEET\_DATA}}. The report should be extremely concise, to the point, professional, and in list format. It should and highlight both strengths and areas for improvement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | You're a financial analyst at AcmeCorp. Generate a Q2 financial report for our investors.<br /><br />AcmeCorp is a B2B SaaS company. Our investors value transparency and actionable insights.<br /><br />Use this data for your report:\<data>\{\{SPREADSHEET\_DATA}}\</data><br /><br />\<instructions><br />1. Include sections: Revenue Growth, Profit Margins, Cash Flow.<br />2. Highlight strengths and areas for improvement.<br />\</instructions><br /><br />Make your tone concise and professional. Follow this structure:<br />\<formatting\_example>\{\{Q1\_REPORT}}\</formatting\_example>                                                                                                                                                                                                                  |
    | Assistant | Q2 Financial Report for AcmeCorp Investors<br /><br />Dear Valued Investors,<br /><br />I am pleased to present our Q2 financial report, showcasing AcmeCorp's continued growth and resilience in the B2B SaaS market.<br /><br />1. Revenue Growth:<br />Our Q2 revenue reached \$15.2M, a 22% YoY increase. This growth is primarily driven by a 30% expansion in our enterprise client base. However, our SMB segment saw a slight decline of 5%, which we aim to address through targeted marketing initiatives in Q3.<br /><br />2. Profit Margins:<br />Gross margin improved to 72% (up 3% from Q1) due to infrastructure optimizations. EBITDA margin, however, dipped to 18% (down 2%) as we invested heavily in R\&D for our upcoming AI-driven features.<br /><br />3. Cash Flow:<br />Operating cash flow remains strong at \$4.1M. Our cash reserves stand at \$28M, providing a 15-month runway at current burn rate. We did see a 20% increase in customer acquisition costs, which we're addressing through more efficient sales strategies.<br /><br />In summary, AcmeCorp's core financials remain robust. We're balancing growth investments with prudent cash management. Our focus for Q3 will be revitalizing SMB growth and optimizing sales efficiency.<br /><br />Thank you for your continued trust.<br /><br />Sincerely,<br />CFO, AcmeCorp | Q2 Financial Report for AcmeCorp Investors\</output><br /><br />Revenue Growth:<br />- Q2 revenue: \$15.2M (22% YoY ↑)<br />- Enterprise clients: 30% ↑<br />- SMB segment: 5% ↓<br />  Action: Targeted Q3 marketing<br /><br />Profit Margins:<br />- Gross margin: 72% (3% ↑ from Q1)<br />  Reason: Infrastructure optimizations<br />- EBITDA margin: 18% (2% ↓)<br />  Reason: R\&D investment in AI features<br /><br />Cash Flow:<br />- Operating cash flow: \$4.1M (strong)<br />- Cash reserves: \$28M (15-month runway)<br />- Customer acquisition cost: 20% ↑<br />  Action: Optimize sales strategies<br /><br />Outlook:<br />- Core financials: Robust<br />- Q3 focus: Revitalize SMB, optimize sales<br /><br />Management remains committed to balancing growth investments with financial discipline. |
  </Accordion>

  <Accordion title="Example: Legal contract analysis">
    Without XML tags, Claude's analysis is disorganized and misses key points. With tags, it provides a structured, thorough analysis that a legal team can act on.

    | Role      | No XML Tags                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | With XML Tags                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
    | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
    | User      | Analyze this software licensing agreement for potential risks and liabilities: \{\{CONTRACT}}. Focus on indemnification, limitation of liability, and IP ownership clauses. Also, note any unusual or concerning terms. Here's our standard contract for reference: \{\{STANDARD\_CONTRACT}}. Give a summary of findings and recommendations for our legal team.                                                                                                                                                                                                                                                                                                                    | Analyze this software licensing agreement for legal risks and liabilities.<br /><br />We're a multinational enterprise considering this agreement for our core data infrastructure.<br /><br />\<agreement><br />\{\{CONTRACT}}\</agreement><br /><br />This is our standard contract for reference:<br />\<standard\_contract>\{\{STANDARD\_CONTRACT}}\</standard\_contract><br /><br />\<instructions><br />1. Analyze these clauses:<br />   - Indemnification<br />   - Limitation of liability<br />   - IP ownership<br /><br />2. Note unusual or concerning terms.<br /><br />3. Compare to our standard contract.<br /><br />4. Summarize findings in \<findings> tags.<br /><br />5. List actionable recommendations in \<recommendations> tags.\</instructions>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
    | Assistant | The provided software licensing agreement presents several concerning aspects. The indemnification clause is overly broad, potentially exposing us to significant liabilities. The limitation of liability section caps damages at a mere \$500, which is inadequate for our enterprise-level usage. Regarding IP, the agreement grants the vendor joint ownership of any modifications or integrations we create.<br /><br />In summary, this agreement is not in our best interest. It exposes us to undue risk, limits our recourse in case of failures, and compromises our intellectual property rights. I recommend renegotiating these terms or seeking alternative vendors. | \<findings><br />1. Indemnification (Clause 8):<br />   - Issue: Overly broad. We indemnify vendor against "any and all claims" arising from our use.<br />   - Risk: Could hold us liable even for vendor's negligence or product defects.<br />   - Deviation: Our standard limits indemnity to claims arising from our violation of agreement.<br /><br />2. Limitation of Liability (Clause 9):<br />   - Issue: Caps all damages at \$500, including direct damages.<br />   - Risk: Grossly inadequate for enterprise use. A critical failure could cost millions.<br />   - Deviation: Our standard allows for direct damages up to 12 months of fees paid.<br /><br />3. IP Ownership (Clause 12):<br />   - Issue: Grants vendor joint ownership of our modifications/integrations.<br />   - Risk: Vendor could use or sell our proprietary algorithms or data insights.<br />   - Deviation: Our standard retains full ownership of our work.<br /><br />4. Unusual Terms:<br />   - Clause 5.3: Vendor can use our usage data for "any purpose."<br />   - Clause 7.2: Vendor can terminate for "convenience" with only 7 days' notice.<br />   - Clause 11: No warranties of any kind, even for basic merchantability.<br />\</findings><br /><br />\<recommendations><br />1. Reject this agreement. Risks far outweigh benefits for an enterprise.<br />2. Counter-propose:<br />   - Indemnification: Limit to claims arising from our violation of agreement.<br />   - Liability: Cap at 12 months' fees for direct damages; negotiate for indirect.<br />   - IP: Full ownership of our modifications/integrations.<br />   - Data Use: Restrict to service improvement only.<br />   - Termination: Minimum 90 days' notice; only for cause.<br />   - Warranties: Demand basic merchantability and fitness for purpose.<br />3. If vendor refuses, explore alternative providers or in-house solutions.<br />4. Engage legal counsel for contract negotiation given high stakes.<br />\</recommendations> |
  </Accordion>
</AccordionGroup>

***

<CardGroup cols={3}>
  <Card title="Prompt library" icon="link" href="/en/resources/prompt-library/library">
    Get inspired by a curated selection of prompts for various tasks and use cases.
  </Card>

  <Card title="GitHub prompting tutorial" icon="link" href="https://github.com/anthropics/prompt-eng-interactive-tutorial">
    An example-filled tutorial that covers the prompt engineering concepts found in our docs.
  </Card>

  <Card title="Google Sheets prompting tutorial" icon="link" href="https://docs.google.com/spreadsheets/d/19jzLgRruG9kjUQNKtCg1ZjdD6l6weA6qRXG5zLIAhC8">
    A lighter weight version of our prompt engineering tutorial via an interactive spreadsheet.
  </Card>
</CardGroup>

# Extended thinking tips

export const TryInConsoleButton = ({userPrompt, systemPrompt, maxTokens, thinkingBudgetTokens, buttonVariant = "primary", children}) => {
  const url = new URL("https://console.anthropic.com/workbench/new");
  if (userPrompt) {
    url.searchParams.set("user", userPrompt);
  }
  if (systemPrompt) {
    url.searchParams.set("system", systemPrompt);
  }
  if (maxTokens) {
    url.searchParams.set("max_tokens", maxTokens);
  }
  if (thinkingBudgetTokens) {
    url.searchParams.set("thinking.budget_tokens", thinkingBudgetTokens);
  }
  return <a href={url.href} className={`btn size-xs ${buttonVariant}`} style={{
    margin: "-0.25rem -0.5rem"
  }}>
      {children || "Try in Console"}{" "}
      <Icon icon="arrow-right" color="currentColor" size={14} />
    </a>;
};

This guide provides advanced strategies and techniques for getting the most out of Claude's extended thinking features. Extended thinking allows Claude to work through complex problems step-by-step, improving performance on difficult tasks.

See [Extended thinking models](/en/docs/about-claude/models/extended-thinking-models) for guidance on deciding when to use extended thinking.

## Before diving in

This guide presumes that you have already decided to use extended thinking mode and have reviewed our basic steps on [how to get started with extended thinking](/en/docs/about-claude/models/extended-thinking-models#getting-started-with-extended-thinking-models) as well as our [extended thinking implementation guide](/en/docs/build-with-claude/extended-thinking).

### Technical considerations for extended thinking

* Thinking tokens have a minimum budget of 1024 tokens. We recommend that you start with the minimum thinking budget and incrementally increase to adjust based on your needs and task complexity.
* For workloads where the optimal thinking budget is above 32K, we recommend that you use [batch processing](/en/docs/build-with-claude/batch-processing) to avoid networking issues. Requests pushing the model to think above 32K tokens causes long running requests that might run up against system timeouts and open connection limits.
* Extended thinking performs best in English, though final outputs can be in [any language Claude supports](/en/docs/build-with-claude/multilingual-support).
* If you need thinking below the minimum budget, we recommend using standard mode, with thinking turned off, with traditional chain-of-thought prompting with XML tags (like `<thinking>`). See [chain of thought prompting](/en/docs/build-with-claude/prompt-engineering/chain-of-thought).

## Prompting techniques for extended thinking

### Use general instructions first, then troubleshoot with more step-by-step instructions

Claude often performs better with high level instructions to just think deeply about a task rather than step-by-step prescriptive guidance. The model's creativity in approaching problems may exceed a human's ability to prescribe the optimal thinking process.

For example, instead of:

<CodeGroup>
  ```text User
  Think through this math problem step by step: 
  1. First, identify the variables
  2. Then, set up the equation
  3. Next, solve for x
  ...
  ```
</CodeGroup>

Consider:

<CodeGroup>
  ```text User
  Please think about this math problem thoroughly and in great detail. 
  Consider multiple approaches and show your complete reasoning.
  Try different methods if your first approach doesn't work.
  ```

  <CodeBlock
    filename={
  <TryInConsoleButton
    userPrompt={
      `Please think about this math problem thoroughly and in great detail. 
Consider multiple approaches and show your complete reasoning.
Try different methods if your first approach doesn't work.`
    }
    thinkingBudgetTokens={16000}
  >
    Try in Console
  </TryInConsoleButton>
}
  />
</CodeGroup>

That said, Claude can still effectively follow complex structured execution steps when needed. The model can handle even longer lists with more complex instructions than previous versions. We recommend that you start with more generalized instructions, then read Claude's thinking output and iterate to provide more specific instructions to steer its thinking from there.

### Multishot prompting with extended thinking

[Multishot prompting](/en/docs/build-with-claude/prompt-engineering/multishot-prompting) works well with extended thinking. When you provide Claude examples of how to think through problems, it will follow similar reasoning patterns within its extended thinking blocks.

You can include few-shot examples in your prompt in extended thinking scenarios by using XML tags like `<thinking>` or `<scratchpad>` to indicate canonical patterns of extended thinking in those examples.

Claude will generalize the pattern to the formal extended thinking process. However, it's possible you'll get better results by giving Claude free rein to think in the way it deems best.

Example:

<CodeGroup>
  ```text User
  I'm going to show you how to solve a math problem, then I want you to solve a similar one.

  Problem 1: What is 15% of 80?

  <thinking>
  To find 15% of 80:
  1. Convert 15% to a decimal: 15% = 0.15
  2. Multiply: 0.15 × 80 = 12
  </thinking>

  The answer is 12.

  Now solve this one:
  Problem 2: What is 35% of 240?
  ```

  <CodeBlock
    filename={
  <TryInConsoleButton
    userPrompt={
      `I'm going to show you how to solve a math problem, then I want you to solve a similar one.

Problem 1: What is 15% of 80?

<thinking>
To find 15% of 80:
1. Convert 15% to a decimal: 15% = 0.15
2. Multiply: 0.15 × 80 = 12
</thinking>

The answer is 12.

Now solve this one:
Problem 2: What is 35% of 240?`
    }
    thinkingBudgetTokens={16000} 
  >
    Try in Console
  </TryInConsoleButton>
}
  />
</CodeGroup>

### Maximizing instruction following with extended thinking

Claude shows significantly improved instruction following when extended thinking is enabled. The model typically:

1. Reasons about instructions inside the extended thinking block
2. Executes those instructions in the response

To maximize instruction following:

* Be clear and specific about what you want
* For complex instructions, consider breaking them into numbered steps that Claude should work through methodically
* Allow Claude enough budget to process the instructions fully in its extended thinking

### Using extended thinking to debug and steer Claude's behavior

You can use Claude's thinking output to debug Claude's logic, although this method is not always perfectly reliable.

To make the best use of this methodology, we recommend the following tips:

* We don't recommend passing Claude's extended thinking back in the user text block, as this doesn't improve performance and may actually degrade results.
* Prefilling extended thinking is explicitly not allowed, and manually changing the model's output text that follows its thinking block is likely going to degrade results due to model confusion.

When extended thinking is turned off, standard `assistant` response text [prefill](/en/docs/build-with-claude/prompt-engineering/prefill-claudes-response) is still allowed.

<Note>
  Sometimes Claude may repeat its extended thinking in the assistant output text. If you want a clean response, instruct Claude not to repeat its extended thinking and to only output the answer.
</Note>

### Making the best of long outputs and longform thinking

For dataset generation use cases, try prompts such as "Please create an extremely detailed table of..." for generating comprehensive datasets.

For use cases such as detailed content generation where you may want to generate longer extended thinking blocks and more detailed responses, try these tips:

* Increase both the maximum extended thinking length AND explicitly ask for longer outputs
* For very long outputs (20,000+ words), request a detailed outline with word counts down to the paragraph level. Then ask Claude to index its paragraphs to the outline and maintain the specified word counts

<Warning>
  We do not recommend that you push Claude to output more tokens for outputting tokens' sake. Rather, we encourage you to start with a small thinking budget and increase as needed to find the optimal settings for your use case.
</Warning>

Here are example use cases where Claude excels due to longer extended thinking:

<AccordionGroup>
  <Accordion title="Complex STEM problems">
    Complex STEM problems require Claude to build mental models, apply specialized knowledge, and work through sequential logical steps—processes that benefit from longer reasoning time.

    <Tabs>
      <Tab title="Standard prompt">
        <CodeGroup>
          ```text User
          Write a python script for a bouncing yellow ball within a square,
          make sure to handle collision detection properly.
          Make the square slowly rotate.
          ```

          <CodeBlock
            filename={
          <TryInConsoleButton
            userPrompt={
              `Write a python script for a bouncing yellow ball within a square,
make sure to handle collision detection properly.
Make the square slowly rotate.`
            }
            thinkingBudgetTokens={16000}
          >
            Try in Console
          </TryInConsoleButton>
        }
          />
        </CodeGroup>

        <Note>
          This simpler task typically results in only about a few seconds of thinking time.
        </Note>
      </Tab>

      <Tab title="Enhanced prompt">
        <CodeGroup>
          ```text User
          Write a Python script for a bouncing yellow ball within a tesseract, 
          making sure to handle collision detection properly. 
          Make the tesseract slowly rotate. 
          Make sure the ball stays within the tesseract.
          ```

          <CodeBlock
            filename={
          <TryInConsoleButton
            userPrompt={
              `Write a Python script for a bouncing yellow ball within a tesseract, 
making sure to handle collision detection properly. 
Make the tesseract slowly rotate. 
Make sure the ball stays within the tesseract.`
            }
            thinkingBudgetTokens={16000}
          >
            Try in Console
          </TryInConsoleButton>
        }
          />
        </CodeGroup>

        <Note>
          This complex 4D visualization challenge makes the best use of long extended thinking time as Claude works through the mathematical and programming complexity.
        </Note>
      </Tab>
    </Tabs>
  </Accordion>

  <Accordion title="Constraint optimization problems">
    Constraint optimization challenges Claude to satisfy multiple competing requirements simultaneously, which is best accomplished when allowing for long extended thinking time so that the model can methodically address each constraint.

    <Tabs>
      <Tab title="Standard prompt">
        <CodeGroup>
          ```text User
          Plan a week-long vacation to Japan.
          ```

          <CodeBlock
            filename={
          <TryInConsoleButton
            userPrompt="Plan a week-long vacation to Japan."
            thinkingBudgetTokens={16000}
          >
            Try in Console
          </TryInConsoleButton>
        }
          />
        </CodeGroup>

        <Note>
          This open-ended request typically results in only about a few seconds of thinking time.
        </Note>
      </Tab>

      <Tab title="Enhanced prompt">
        <CodeGroup>
          ```text User
          Plan a 7-day trip to Japan with the following constraints:
          - Budget of $2,500
          - Must include Tokyo and Kyoto
          - Need to accommodate a vegetarian diet
          - Preference for cultural experiences over shopping
          - Must include one day of hiking
          - No more than 2 hours of travel between locations per day
          - Need free time each afternoon for calls back home
          - Must avoid crowds where possible
          ```

          <CodeBlock
            filename={
          <TryInConsoleButton
            userPrompt={
              `Plan a 7-day trip to Japan with the following constraints:
- Budget of $2,500
- Must include Tokyo and Kyoto
- Need to accommodate a vegetarian diet
- Preference for cultural experiences over shopping
- Must include one day of hiking
- No more than 2 hours of travel between locations per day
- Need free time each afternoon for calls back home
- Must avoid crowds where possible`
            }
            thinkingBudgetTokens={16000}
          >
            Try in Console
          </TryInConsoleButton>
        }
          />
        </CodeGroup>

        <Note>
          With multiple constraints to balance, Claude will naturally perform best when given more space to think through how to satisfy all requirements optimally.
        </Note>
      </Tab>
    </Tabs>
  </Accordion>

  <Accordion title="Thinking frameworks">
    Structured thinking frameworks give Claude an explicit methodology to follow, which may work best when Claude is given long extended thinking space to follow each step.

    <Tabs>
      <Tab title="Standard prompt">
        <CodeGroup>
          ```text User
          Develop a comprehensive strategy for Microsoft 
          entering the personalized medicine market by 2027.
          ```

          <CodeBlock
            filename={
          <TryInConsoleButton
            userPrompt={
              `Develop a comprehensive strategy for Microsoft 
entering the personalized medicine market by 2027.`
            }
            thinkingBudgetTokens={16000}
          >
            Try in Console
          </TryInConsoleButton>
        }
          />
        </CodeGroup>

        <Note>
          This broad strategic question typically results in only about a few seconds of thinking time.
        </Note>
      </Tab>

      <Tab title="Enhanced prompt">
        <CodeGroup>
          ```text User
          Develop a comprehensive strategy for Microsoft entering 
          the personalized medicine market by 2027.

          Begin with:
          1. A Blue Ocean Strategy canvas
          2. Apply Porter's Five Forces to identify competitive pressures

          Next, conduct a scenario planning exercise with four 
          distinct futures based on regulatory and technological variables.

          For each scenario:
          - Develop strategic responses using the Ansoff Matrix

          Finally, apply the Three Horizons framework to:
          - Map the transition pathway
          - Identify potential disruptive innovations at each stage
          ```

          <CodeBlock
            filename={
          <TryInConsoleButton
            userPrompt={
              `Develop a comprehensive strategy for Microsoft entering 
the personalized medicine market by 2027.

Begin with:
1. A Blue Ocean Strategy canvas
2. Apply Porter's Five Forces to identify competitive pressures

Next, conduct a scenario planning exercise with four 
distinct futures based on regulatory and technological variables.

For each scenario:
- Develop strategic responses using the Ansoff Matrix

Finally, apply the Three Horizons framework to:
- Map the transition pathway
- Identify potential disruptive innovations at each stage`
            }
            thinkingBudgetTokens={16000}
          >
            Try in Console
          </TryInConsoleButton>
        }
          />
        </CodeGroup>

        <Note>
          By specifying multiple analytical frameworks that must be applied sequentially, thinking time naturally increases as Claude works through each framework methodically.
        </Note>
      </Tab>
    </Tabs>
  </Accordion>
</AccordionGroup>

### Have Claude reflect on and check its work for improved consistency and error handling

You can use simple natural language prompting to improve consistency and reduce errors:

1. Ask Claude to verify its work with a simple test before declaring a task complete
2. Instruct the model to analyze whether its previous step achieved the expected result
3. For coding tasks, ask Claude to run through test cases in its extended thinking

Example:

<CodeGroup>
  ```text User
  Write a function to calculate the factorial of a number. 
  Before you finish, please verify your solution with test cases for:
  - n=0
  - n=1
  - n=5
  - n=10
  And fix any issues you find.
  ```

  <CodeBlock
    filename={
  <TryInConsoleButton
    userPrompt={
      `Write a function to calculate the factorial of a number. 
Before you finish, please verify your solution with test cases for:
- n=0
- n=1
- n=5
- n=10
And fix any issues you find.`
    }
    thinkingBudgetTokens={16000}
  >
    Try in Console
  </TryInConsoleButton>
}
  />
</CodeGroup>

## Next steps

<CardGroup>
  <Card title="Extended thinking cookbook" icon="book" href="https://github.com/anthropics/anthropic-cookbook/tree/main/extended_thinking">
    Explore practical examples of extended thinking in our cookbook.
  </Card>

  <Card title="Extended thinking guide" icon="code" href="/en/docs/build-with-claude/extended-thinking">
    See complete technical documentation for implementing extended thinking.
  </Card>
</CardGroup>

# Increase output consistency (JSON mode)

Here's how to make Claude's responses more consistent:

## Specify the desired output format

Precisely define your desired output format using JSON, XML, or custom templates so that Claude understands every output formatting element you require.

<Accordion title="Example: Standardizing customer feedback">
  | Role      | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
  | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | User      | You're a Customer Insights AI. Analyze this feedback and output in JSON format with keys: "sentiment" (positive/negative/neutral), "key\_issues" (list), and "action\_items" (list of dicts with "team" and "task").<br /><br />"I've been a loyal user for 3 years, but the recent UI update is a disaster. Finding basic features is now a scavenger hunt. Plus, the new 'premium' pricing is outrageous. I'm considering switching unless this is fixed ASAP."                                                                                                                                                                                                                                                                                                                                                |
  | Assistant | \{<br />  "sentiment": "negative",<br />  "key\_issues": \[<br />    "Poor UI/UX in recent update",<br />    "Difficulty finding basic features",<br />    "Perceived high pricing (new 'premium' tier)"<br />  ],<br />  "action\_items": \[<br />    \{<br />      "team": "Product",<br />      "task": "Conduct usability testing and iterate on UI based on findings"<br />    },<br />    \{<br />      "team": "UX",<br />      "task": "Create a feature discovery guide or onboarding flow"<br />    },<br />    \{<br />      "team": "Marketing",<br />      "task": "Review pricing strategy and communicate value proposition"<br />    },<br />    \{<br />      "team": "Customer Success",<br />      "task": "Reach out to user, offer concessions to prevent churn"<br />    }<br />  ]<br />} |
</Accordion>

## Prefill Claude's response

Prefill the `Assistant` turn with your desired format. This trick bypasses Claude's friendly preamble and enforces your structure.

<Accordion title="Example: Daily sales report">
  | Role                | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
  | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | User                | You're an insightful Sales Intelligence AI. Generate today's sales report.<br /><br />Structure the report like this:<br /><br />\<report><br />    \<summary><br />        \<metric name="total\_revenue">\$0.00\</metric><br />        \<metric name="units\_sold">0\</metric><br />        \<metric name="avg\_order\_value">\$0.00\</metric><br />    \</summary><br />    \<top\_products><br />        \<product><br />            \<name>Product Name\</name><br />            \<revenue>\$0.00\</revenue><br />            \<units>0\</units><br />        \</product><br />        ...<br />    \</top\_products><br />    \<regional\_performance><br />        \<region><br />            \<name>Region Name\</name><br />            \<revenue>\$0.00\</revenue><br />            \<growth>0.0%\</growth><br />        \</region><br />        ...<br />    \</regional\_performance><br />    \<action\_items><br />        \<item>Action item.\</item><br />        ...<br />    \</action\_items><br />\</report>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
  | Assistant (prefill) | \<report><br />    \<summary><br />        \<metric name=                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
  | Assistant           | "total\_revenue">\$842,567.00\</metric><br />        \<metric name="units\_sold">15,238\</metric><br />        \<metric name="avg\_order\_value">\$55.29\</metric><br />    \</summary><br />    \<top\_products><br />        \<product><br />            \<name>AcmeGuard Pro\</name><br />            \<revenue>\$325,890.00\</revenue><br />            \<units>3,621\</units><br />        \</product><br />        \<product><br />            \<name>AcmeVault Enterprise\</name><br />            \<revenue>\$254,400.00\</revenue><br />            \<units>1,272\</units><br />        \</product><br />        \<product><br />            \<name>AcmeBoost XL\</name><br />            \<revenue>\$147,690.00\</revenue><br />            \<units>4,923\</units><br />        \</product><br />    \</top\_products><br />    \<regional\_performance><br />        \<region><br />            \<name>APAC\</name><br />            \<revenue>\$258,960.00\</revenue><br />            \<growth>12.8%\</growth><br />        \</region><br />        \<region><br />            \<name>EMEA\</name><br />            \<revenue>\$325,478.00\</revenue><br />            \<growth>3.2%\</growth><br />        \</region><br />        \<region><br />            \<name>Americas\</name><br />            \<revenue>\$258,129.00\</revenue><br />            \<growth>-2.1%\</growth><br />        \</region><br />    \</regional\_performance><br />    \<action\_items><br />        \<item>Investigate Americas revenue drop; schedule regional sales team meeting.\</item><br />        \<item>Accelerate CloudGuard Pro rollout in APAC to capitalize on growth.\</item><br />        \<item>Review NetBoost XL pricing; high volume but lower revenue.\</item><br />    \</action\_items><br />\</report> |
</Accordion>

## Constrain with examples

Provide examples of your desired output. This trains Claude's understanding better than abstract instructions.

<Accordion title="Example: Generating consistent market intelligence">
  | Role      | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
  | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | User      | As a Market Intelligence AI, your task is to analyze data about our competitors. Here is our competitor data:<br />\<data><br />\{\{DATA}}<br />\</data><br /><br />Output following this example format:<br /><br />\<competitor><br />  \<name>Rival Inc\</name><br />  \<overview>A 50-word summary.\</overview><br />  \<swot><br />    \<strengths>- Bullet points\</strengths><br />    \<weaknesses>- Bullet points\</weaknesses><br />    \<opportunities>- Bullet points\</opportunities><br />    \<threats>- Bullet points\</threats><br />  \</swot><br />  \<strategy>A 30-word strategic response.\</strategy><br />\</competitor><br /><br />Now, analyze AcmeGiant and AcmeDataCo using this format.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
  | Assistant | \<competitor><br />  \<name>AcmeGiant\</name><br />  \<overview>Global tech leader with a vast ecosystem of consumer and enterprise products. Known for innovation, strong brand, and deep customer lock-in through integrated hardware, software, and services.\</overview><br />  \<swot><br />    \<strengths><br />      - Massive R\&D budget fuels continuous innovation<br />      - Loyal customer base and powerful brand recognition<br />      - Synergistic product ecosystem increases switching costs<br />    \</strengths><br />    \<weaknesses><br />      - High prices may deter cost-sensitive customers<br />      - Slow to address enterprise-specific customization needs<br />      - Privacy concerns and regulatory scrutiny in multiple markets<br />    \</weaknesses><br />    \<opportunities><br />      - Growing demand for AI and ML capabilities<br />      - Expansion into emerging markets<br />      - Acquisitions to fill product or talent gaps<br />    \</opportunities><br />    \<threats><br />      - Rapid rise of cloud-native competitors<br />      - Antitrust lawsuits and regulatory actions<br />      - Talent poaching by startups and competitors<br />    \</threats><br />  \</swot><br />  \<strategy>Focus on our agility and customization. Target TechGiant's slow enterprise response and privacy issues in our marketing.\</strategy><br />\</competitor><br /><br />\<competitor><br />  \<name>AcmeDataCo\</name><br />  \<overview>Rising star in data analytics and visualization. Offers intuitive, self-service BI tools with a freemium model, appealing to startups and enterprise teams alike.\</overview><br />  \<swot><br />    \<strengths><br />      - User-friendly interface reduces need for specialized training<br />      - Freemium model lowers barrier to entry, drives viral growth<br />      - Strong product-market fit with rise of data-driven decisions<br />    \</strengths><br />    \<weaknesses><br />      - Limited advanced analytics compared to established BI tools<br />      - Scaling issues reported with very large datasets<br />      - Dependent on third-party cloud infrastructure (AWS)<br />    \</weaknesses><br />    \<opportunities><br />      - Expanding into predictive analytics and AI-driven insights<br />      - Forming strategic alliances with complementary tech vendors<br />      - Customizable dashboards for industry-specific solutions<br />    \</opportunities><br />    \<threats><br />      - Market saturation; many new entrants in self-service BI<br />      - Enterprise BI giants developing more user-friendly tools<br />      - Data privacy regulations increasing compliance complexity<br />    \</threats><br />  \</swot><br />  \<strategy>Highlight our robust enterprise features and data governance. Target accounts struggling with DataCo's scale limitations.\</strategy><br />\</competitor> |
</Accordion>

## Use retrieval for contextual consistency

For tasks requiring consistent context (e.g., chatbots, knowledge bases), use retrieval to ground Claude's responses in a fixed information set.

<Accordion title="Example: Enhancing IT support consistency">
  | Role      | Content                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
  | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | User      | You're our IT Support AI that draws on knowledge base data. Here are entries from your knowledge base:<br /><br />\<kb><br />  \<entry><br />    \<id>1\</id><br />    \<title>Reset Active Directory password\</title><br />    \<content>1. Go to password.ourcompany.com<br />2. Enter your username<br />3. Click "Forgot Password"<br />4. Follow email instructions\</content><br />  \</entry><br />  \<entry><br />    \<id>2\</id><br />    \<title>Connect to VPN\</title><br />    \<content>1. Install GlobalProtect from software center<br />2. Open GlobalProtect, enter "vpn.ourcompany.com"<br />3. Use AD credentials to log in\</content><br />  \</entry><br />\</kb><br /><br />When helping users, always check the knowledge base first. Respond in this format:<br /><br />\<response><br />  \<kb\_entry>Knowledge base entry used\</kb\_entry><br />  \<answer>Your response\</answer><br />\</response> Write some test questions for yourself and answer them using the knowledge base, just to make sure you understand how to use the knowledge base properly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
  | Assistant | Understood. I'll use the knowledge base for consistent responses. Let's test with a couple of scenarios.<br /><br />User: Hey, I can't log into my email. I think I forgot my password.<br /><br />\<response><br />  \<kb\_entry>1: Reset Active Directory password\</entry><br />  \<answer>I understand you're having trouble logging into your email due to a forgotten password. No worries, this is a common issue. To reset your Active Directory password, which is used for email access, follow these steps:<br /><br />1. Go to password.ourcompany.com<br />2. Enter your username (same as your email address)<br />3. Click on the "Forgot Password" link<br />4. You'll receive an email with instructions. Follow them to reset your password.<br /><br />After resetting, you should be able to log into your email. Let me know if you need any further assistance.\</answer><br />\</response><br /><br />User: I'm working from home today. How do I access internal resources?<br /><br />\<response><br />  \<kb\_entry>2: Connect to VPN\</entry><br />  \<answer>Great question! To access internal resources while working from home, you'll need to connect to our company VPN (Virtual Private Network). Here's how to set that up:<br /><br />1. First, install the GlobalProtect VPN client. You can find this in our software center.<br />2. Once installed, open the GlobalProtect application.<br />3. In the server field, enter "vpn.ourcompany.com".<br />4. Use your Active Directory (AD) credentials to log in - the same username and password you use for your email.<br /><br />Once connected, you'll have secure access to all internal resources as if you were in the office. Let me know if you run into any issues during setup.\</answer><br />\</response> |
</Accordion>

## Chain prompts for complex tasks

Break down complex tasks into smaller, consistent subtasks. Each subtask gets Claude's full attention, reducing inconsistency errors across scaled workflows.
# Long context prompting tips

<Note>
  While these tips apply broadly to all Claude models, you can find prompting tips specific to extended thinking models [here](/en/docs/build-with-claude/prompt-engineering/extended-thinking-tips).
</Note>

Claude's extended context window (200K tokens for Claude 3 models) enables handling complex, data-rich tasks. This guide will help you leverage this power effectively.

## Essential tips for long context prompts

* **Put longform data at the top**: Place your long documents and inputs (\~20K+ tokens) near the top of your prompt, above your query, instructions, and examples. This can significantly improve Claude's performance across all models.

  <Note>Queries at the end can improve response quality by up to 30% in tests, especially with complex, multi-document inputs.</Note>

* **Structure document content and metadata with XML tags**: When using multiple documents, wrap each document in `<document>` tags with `<document_content>` and `<source>` (and other metadata) subtags for clarity.

  <Accordion title="Example multi-document structure">
    ```xml
    <documents>
      <document index="1">
        <source>annual_report_2023.pdf</source>
        <document_content>
          {{ANNUAL_REPORT}}
        </document_content>
      </document>
      <document index="2">
        <source>competitor_analysis_q2.xlsx</source>
        <document_content>
          {{COMPETITOR_ANALYSIS}}
        </document_content>
      </document>
    </documents>

    Analyze the annual report and competitor analysis. Identify strategic advantages and recommend Q3 focus areas.
    ```
  </Accordion>

* **Ground responses in quotes**: For long document tasks, ask Claude to quote relevant parts of the documents first before carrying out its task. This helps Claude cut through the "noise" of the rest of the document's contents.

  <Accordion title="Example quote extraction">
    ```xml
    You are an AI physician's assistant. Your task is to help doctors diagnose possible patient illnesses.

    <documents>
      <document index="1">
        <source>patient_symptoms.txt</source>
        <document_content>
          {{PATIENT_SYMPTOMS}}
        </document_content>
      </document>
      <document index="2">
        <source>patient_records.txt</source>
        <document_content>
          {{PATIENT_RECORDS}}
        </document_content>
      </document>
      <document index="3">
        <source>patient01_appt_history.txt</source>
        <document_content>
          {{PATIENT01_APPOINTMENT_HISTORY}}
        </document_content>
      </document>
    </documents>

    Find quotes from the patient records and appointment history that are relevant to diagnosing the patient's reported symptoms. Place these in <quotes> tags. Then, based on these quotes, list all information that would help the doctor diagnose the patient's symptoms. Place your diagnostic information in <info> tags.
    ```
  </Accordion>

***

<CardGroup cols={3}>
  <Card title="Prompt library" icon="link" href="/en/resources/prompt-library/library">
    Get inspired by a curated selection of prompts for various tasks and use cases.
  </Card>

  <Card title="GitHub prompting tutorial" icon="link" href="https://github.com/anthropics/prompt-eng-interactive-tutorial">
    An example-filled tutorial that covers the prompt engineering concepts found in our docs.
  </Card>

  <Card title="Google Sheets prompting tutorial" icon="link" href="https://docs.google.com/spreadsheets/d/19jzLgRruG9kjUQNKtCg1ZjdD6l6weA6qRXG5zLIAhC8">
    A lighter weight version of our prompt engineering tutorial via an interactive spreadsheet.
  </Card>
</CardGroup>
