def build_prompt(
    analysis,
    product,
    pose,
    lighting_body=None
):
    """
    Stable unified prompt builder
    """

    comp = analysis.get("composition", "clean product shot")
    light = analysis.get("lighting", "soft studio lighting")
    bg = analysis.get("background", "clean white background")
    tone = analysis.get("color_tone", "neutral commercial tone")

    prompt = f"""
Professional product photography

Product: {product}
Pose: {pose}

Composition: {comp}
Lighting: {light}
Background: {bg}
Color tone: {tone}

Style:
- high-end commercial advertising
- ultra realistic
- sharp focus
- studio photography
"""

    if lighting_body:
        prompt += f"\nLighting direction: {lighting_body}\n"

    prompt += "\n8k, commercial product ad, instagram ready"

    return prompt