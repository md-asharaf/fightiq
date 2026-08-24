from app.utils.scraper import scrape_topic


def test():
    result = scrape_topic("Islam Makhachev")
    if result:
        print("TITLE:", result["title"])
        print("CONTENT PREVIEW:", result["content"][:500])
        print("HAS TABLES?", "| " in result["content"])
    else:
        print("FAILED")

if __name__ == "__main__":
    test()
