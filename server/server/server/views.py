import requests
from django.http import HttpResponse
from PIL import Image
from io import BytesIO

def get_streetview_image(request):
    if request.method == 'GET':
        latitude = request.GET.get('latitude')
        longitude = request.GET.get('longitude')
        angle = request.GET.get('angle')
        pov = request.GET.get('pov')
        image_width = request.GET.get('image_width')
        image_height = request.GET.get('image_height')
        api_key = 'AIzaSyBrihFqby1UCOB9U0pMfSHauXWZlFtLfek'

        if latitude and longitude and angle and pov and image_width and image_height:
            url = f"https://maps.googleapis.com/maps/api/streetview?size={image_width}x{image_height}&location={latitude},{longitude}&heading={angle}&key={api_key}&pov={pov}"

            try:
                # Make a request to the Google Maps Static API
                response = requests.get(url)

                if response.status_code == 200:
                    # Convert the image to PNG format
                    image = Image.open(BytesIO(response.content))
                    image = image.convert("RGB")

                    # Create a BytesIO object to store the converted image
                    image_io = BytesIO()

                    # Save the image as PNG to the BytesIO object
                    image.save(image_io, format='JPEG')
                    image_io.seek(0)

                    # Return the image as the response with the appropriate content type
                    return HttpResponse(image_io, content_type='image/jpeg')

                return HttpResponse("Failed to retrieve image from Google Maps API.", status=500)

            except requests.exceptions.RequestException:
                return HttpResponse("Failed to connect to Google Maps API.", status=500)

        return HttpResponse("Invalid parameters.", status=400)

    return HttpResponse("Invalid request method.", status=405)