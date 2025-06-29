# Remove trim_prompt_to_token_limit and count_tokens from this file. Leave only any other relevant code (if any).

try:
    import tiktoken

    def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
        enc = tiktoken.encoding_for_model(model)
        return len(enc.encode(text))

except ImportError:

    def count_tokens(text: str, model: str = None) -> int:
        # Fallback: count words as a rough proxy
        return len(text.split())
