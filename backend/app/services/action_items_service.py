

def generate_action_items(conversation_summary: str) -> list[dict]:
    """Generate action items from a conversation summary.
    
    Args:
        Summary: String containing the conversation summary
        
    Returns:
        List of action items
    """
    if not conversation_summary:
        return []
    
    start = conversation_summary.find("ACTION_ITEMS:")
    if start == -1:
        return []
    
    end = conversation_summary.find("END_ACTION_ITEMS", start + len("ACTION_ITEMS:"))
    if end == -1:
        return []
    
    block = conversation_summary[start + len("ACTION_ITEMS:"):end].strip()
    if not block or 'no actions agreed' in block.lower().strip():
        return []
    
    action_items = []
    for line in block.splitlines():
        line = line.strip()
        if not line or not line.startswith("-"):
            continue
        parts = [p.strip().strip('"').strip("'") for p in line[1:].split("|")]
        title = parts[0].strip() if len(parts) > 0 else ""
        status = parts[1].lower().strip() if len(parts) > 1 else "open"
        description = parts[2] if len(parts) > 2 else ""

        if not title:
            continue
        if status not in ['open', 'closed']:
            status = 'open'
        action_items.append({
            "title": title,
            "status": status,
            "description": description
        })

    return action_items


