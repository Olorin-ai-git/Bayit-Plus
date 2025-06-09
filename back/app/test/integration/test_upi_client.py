# import asyncio
# import logging
# from app.adapters.upi_client import UPIClient
# from app.service.config import get_settings_for_env
#
# # Configure logging
# logging.basicConfig(level=logging.DEBUG)
#
# async def main():
#     # Retrieve the settings for the current environment
#     settings = get_settings_for_env()
#
#     # Initialize the UPIClient with the base URL from settings
#     upi_client = UPIClient()
#
#     # Define the headers for the request
#     headers = {
#         "Content-Type": "application/json",
#         "Authorization": (
#             "Intuit_IAM_Authentication intuit_token_type=IAM-Ticket, "
#             "intuit_appid=Intuit.appfabric.genuxtestclient, "
#             "intuit_app_secret=<secret>, "
#             "intuit_userid=<userid>, "
#             "intuit_token=<token>, "
#         ),
#         "intuit_originating_assetalias": "Intuit.data.mlplatform.genosux",
#         "intuit_tid": "a233523b-4a57-4a05-9fb4-3e886e58fc4d",
#         "intuit_experience_id": "test1"
#     }
#
#     # Define the experience_id and agent_name
#     experience_id = "ererereer"
#     agent_name = "ereererre"
#
#     # Make the call to the UPI service
#     try:
#         result = await upi_client.call_upi_service(experience_id=experience_id, agent_name=agent_name,intuit_headers= headers)
#         print("UPI Service Response:", result)
#     except Exception as e:
#         print(f"An error occurred: {e}")
#
# # Run the main function
# if __name__ == "__main__":
#     asyncio.run(main())
