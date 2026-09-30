from pathlib import Path

from .common import read_text_file


BASE_DIR = Path(__file__).resolve().parents[1]
INSTRUCTION_ROOTS = [
    BASE_DIR / "input" / "instructions",
    BASE_DIR / "instructions",
]


def instruction_domain_dir(domain):
    for root in INSTRUCTION_ROOTS:
        path = root / domain
        if path.exists():
            return path

    return INSTRUCTION_ROOTS[0] / domain


def read_instruction_file(domain, name):
    checked = []

    for root in INSTRUCTION_ROOTS:
        path = root / domain / name
        checked.append(path)

        if path.exists():
            return read_text_file(path)

    locations = "\n".join(f"  - {path}" for path in checked)
    raise FileNotFoundError(
        f"Instruction file not found for {domain}/{name}. Checked:\n{locations}"
    )


def read_optional_instruction_file(domain, name):
    try:
        return read_instruction_file(domain, name)
    except FileNotFoundError:
        return ""


def compose_instruction_prompt(
    domain,
    extra_files=None,
    include_parameter_explanation=True,
):
    sections = []

    instruction_files = ["chat_context.txt"]
    if include_parameter_explanation:
        instruction_files.append("parameter_explanation.txt")

    for name in instruction_files:
        text = read_optional_instruction_file(domain, name)
        if text:
            sections.append(text)

    for name in extra_files or []:
        text = read_optional_instruction_file(domain, name)
        if text:
            sections.append(text)

    json_instruction = read_optional_instruction_file(domain, "json_instruction.txt")
    if json_instruction:
        sections.append(f"Output instruction:\n\n{json_instruction}")

    if not sections:
        raise FileNotFoundError(
            f"No instruction sections found for {domain} under input/instructions or instructions."
        )

    return "\n\n---\n\n".join(section.strip() for section in sections if section.strip())
