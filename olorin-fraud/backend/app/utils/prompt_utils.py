try:
    import tiktoken

    def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
        enc = tiktoken.encoding_for_model(model)
        return len(enc.encode(text))

except ImportError:

    def count_tokens(text: str, model: str = None) -> int:
        # Fallback: count words as a rough proxy
        return len(text.split())


def trim_prompt_to_token_limit(
    prompt_data, system_prompt, max_tokens, list_fields_priority, model="gpt-3.5-turbo"
):
    import json

    trimmed = {k: v for k, v in prompt_data.items()}
    trimmed_any = False
    while True:
        prompt_str = json.dumps(trimmed, indent=2)
        llm_input_prompt = f"{system_prompt}\n{prompt_str}"
        if count_tokens(llm_input_prompt, model) <= max_tokens:
            return trimmed, llm_input_prompt, trimmed_any
        for field in list_fields_priority:
            if (
                field in trimmed
                and isinstance(trimmed[field], list)
                and len(trimmed[field]) > 1
            ):
                trimmed[field] = trimmed[field][
                    -(len(trimmed[field]) // 2) :
                ]  # Keep most recent half
                trimmed_any = True
                break
        else:
            # Can't trim further
            return trimmed, llm_input_prompt, trimmed_any


def sanitize_splunk_data(splunk_data):
    # Remove any sensitive or unnecessary fields from Splunk data before sending to LLM
    # This is a placeholder; customize as needed for your data
    if not splunk_data:
        return []
    sanitized = []
    for event in splunk_data:
        sanitized_event = {k: v for k, v in event.items() if not k.startswith("_raw")}
        sanitized.append(sanitized_event)
    return sanitized


# Add more shared prompt-related helpers here as needed
