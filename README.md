# Geo Cars
[Demo Video](https://youtu.be/FaLgU4Q7DB4)

## Problem description
The problem we are trying to solve is given a specific area which is the most common car make. Our hypothesis is that in more affluent areas, we might expect nicer, more expensive car brands, whereas, in other areas, they might have different values, such as efficiency. We do not have data to support this, which is why our idea would give us data to back up our claims. This data could also be useful to car manufacturers; for example Tesla would want to build superchargers where people drive Teslas the most.

## Previous work (including what you used for your method i.e. pretrained models)
Car Model from Kaggle (https://www.kaggle.com/code/vedraiyani/car-model-classification)
  - We trained this with the Stanford car dataset (https://www.kaggle.com/datasets/jutrera/stanford-car-dataset-by-classes-folder)
  - Transfer learned based on ResNet
Google Maps API, Google Static Street View API
  - Map component of our application and being able to get street view images from dropped pins

Frameworks:
  - ML5 (javascript computer vision framework)
    - YOLO Object Detection
  - Pytorch (python machine learning framework)
    - Used in training the car machine learning model

## Your approach:
Our original course of action was as follows: we will start with a live video feed of traffic from the SDOT Travelers website and feed that into an object detector. From there, if a car has been detected, we will select the image of that car and feed that into a neural network model that will predict the car’s make. We will work on the computer vision component of the car detection as objects generally, and then the model we are feeding the cars into is a framework model that we’ve not trained (the dataset used for this model was the Stanford Cars Dataset). After we’ve identified the car brands, we will be able to update a spreadsheet showing the most common car brands in X area. Our goal is to show the live video feed on our project website as well as our collected data of the most common car brand in that area. Upon starting to work, we realized that the car detection itself from live video feeds was difficult for reasons including that cars were moving, the footage was sometimes blurry, etc. This is where we pivoted our approach, but we still went down a similar path.

The starting screen of our application displays a map (using Google Maps API), that the user can pan around on. They can then drop points in any location they choose and our client code evenly distributes these points to draw a bounding rectangle of the area. An API request is then called by our server (Django), and is sent to the Google Static Street View API to get a panorama image of the area selected, which we then display to the user on our application. 

Given this panorama image of the street view of the area selected by the user, the first step is to identify the cars that are present in the image. We do this by using YOLO Object Detection first to identify objects and then more specifically cars. We then extract the bounding box areas of the cars (given by YOLO) and send these images to our server. These new extracted images are then passed into the car image identification model (discussed in previous work) to classify the car image based on its make and model and then label it accordingly. Finally, we display the results to the user. These include the panorama images at each of the points with boxes around the cars detected, the extracted images of those cars as well as the labels given by the model, and a bar graph of the most common car make and model in that area.

## Datasets
Stanford car dataset
  - https://www.kaggle.com/datasets/jutrera/stanford-car-dataset-by-classes-folder

## Results
A sample of an example result we get for around campus
![MY_Image](/cv_street.png)
![MY_Image](/cv_cars.png)
![MY_Image](/cv_chart.png)

As you can see from a small sample of our example results, our application functions as we intended it to in that we identify the most common car make and model in the area the user selects but there are a good number of inaccuracies. This is partially due to the model not being the best as well as the fact that the Stanford car dataset is quite outdated and does not contain modern cars (cars made after around 2017). There were also some edge cases that were hard for us to implement, such as image borders sometimes not being the right spot, cars appearing far away which made them tough to classify, and cases where multiple cars were right next to each other.

## Discussion
What problems did you encounter?
  - Took a lot of time to integrate all of our parts into this application
    - For example, identifying objects from a non-local site (google api) was harder than expected since we could not use the model since CORS detected security issue so we had to use a proxy api call to get the data “locally”
  - Stanford car dataset was outdated and did not contain modern cars, the model we found also did not have the accuracies we would have liked after we trained it
    - Even finding a model was quite difficult, many resources we looked at talked about a car image classification model but did not actually provide training code/weights
    - Ending up finding the model we used off of Kaggle and had to train ourselves
  - Could’ve planned better, we had a general idea from the start but many issues we ended up having to resolve on the fly

Are there next steps you would take if you kept working on the project?
  - Addressing the issues we talked about - finding a better dataset and model as well as coming up with solutions to deal with the edge cases mentioned above
  - Polishing the UI/UX for a better user experience
  - Actually deploying our website
    - Tough to deploy because the APIs we use would then need to be deployed, and since we are using Google APIs this would cost money :(
  - Adding a past results feature, currently it only does one query and does not save the past query, so adding that saving would be great.
  - We could have better data visualization, currently, we only have bar charts but could add other methods like heatmaps of certain types of cars in areas.

How does your approach differ from others? Was that beneficial?
  - In selecting our idea for this project, we thought of trying to make something that could actually prove useful to others
  - We integrated a lot of technologies to make this a fully-functioning application, we definitely believe this is nicer to have as opposed to just displaying model results, charts, etc.
  - Many other programs/apps that others have written can classify cars given images, but we are able to have that same functionality in addition to being able to see the results per area, and this can prove to be beneficial in many ways like we described in our initial problem description
  - Our end product satisfies our original goal of identifying the common car makes and models in certain areas :)


