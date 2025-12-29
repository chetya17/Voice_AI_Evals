from livekit import api

token = api.AccessToken("APIWRwxXv47vQBL", "2ZaNw0e79ecj4hwjNHLoKMXyyzY4eLEq64b64GjTrxnA") \
    .with_identity("listener") \
    .with_name("Browser Listener") \
    .with_grants(api.VideoGrants(room_join=True, room="testingsims")) \
    .to_jwt()

print(f"https://meet.livekit.io/?liveKitUrl=wss://testingsims-1ld2n6n8.livekit.cloud#token={token}")