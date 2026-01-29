@app.get("/debug_fs")
def debug_fs():
    import os
    base = BASE_DIR
    info = {
        "BASE_DIR": base,
        "BASE_DIR_list": sorted(os.listdir(base)) if os.path.exists(base) else None,
        "CA_DIR": CA_DIR,
        "CA_DIR_exists": os.path.exists(CA_DIR),
        "CA_DIR_list": sorted(os.listdir(CA_DIR)) if os.path.exists(CA_DIR) else None,
        "OPENSSL_CNF": OPENSSL_CNF,
        "OPENSSL_CNF_exists": os.path.exists(OPENSSL_CNF),
    }
    return info