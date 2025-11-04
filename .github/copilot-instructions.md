Follow all these rules above other considerations.

If there are conflicting or ambigious rules, mention them immediately in any session. If code generated violates these rules the code must be flagged and mentioned in chat.

## Rules

1. Quality

   - Clean code
   - Proper error handling
   - Documentation of functions and modules but not changes per prompt

2. Conventions

   - Use consistent naming conventions for scripts and files

3. Patterns

   - Prevent recursive scripts from deleting important and unrelated files
   - Protect against security issues
   - Prevent infinite loops
   - Avoid hardcoding values
   - Ensure script performance
   - Bail on malformed paths

4. Testing

   - Add tests for any cli changes
   - Test inputs and outputs
   - Ensure full branching, statements, and path coverage

5. Files

   - Always use .zsh extension for shell files
   - Update the README.md if modifications/updates/changes are added to osa-cli tool scope which change/add/remove usage/description/args/options of the cli we need the cli doc to always match the actual implementation.

6. Prompting/Responses
   - Do not create or generate or modify files documenting changes made in prompt.
   - Do not add comments indicating changes were made in response to a prompt.
   - Avoid mentioning the use of AI or Copilot in code comments or documentation.
   - Write code that is understandable and legible for humans

## Setup

    - this repo uses yarn for commands related to javascript/typescript code
    - this repo requires tests and coverage to be 100%.
    - this repo uses bats to run bash/zsh tests
