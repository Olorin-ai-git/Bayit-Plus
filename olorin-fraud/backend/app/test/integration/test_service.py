# from fastapi import status
#
#
# def test_create_app(client):
#     with client:
#         assert True
#
#
# def test_health_check(client):
#     response = client.get("/health/full")
#     assert response.status_code == status.HTTP_200_OK
#     assert response.json() == {"status": "Healthy"}
