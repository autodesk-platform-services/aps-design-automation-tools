# Design Automation Tools

[![Node.js](https://img.shields.io/badge/Node.js-10.16.2-blue.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-6.9.0-blue.svg)](https://www.npmjs.com/)
![Platforms](https://img.shields.io/badge/platform-windows%20%7C%20osx%20%7C%20linux-lightgray.svg)
[![License](https://img.shields.io/:license-mit-blue.svg)](https://opensource.org/licenses/MIT)

[![OAuth2](https://img.shields.io/badge/OAuth2-v1-green.svg)](https://aps.autodesk.com/)
[![Design Automation](https://img.shields.io/badge/Design%20Automation-v3-green.svg)](https://aps.autodesk.com/)

This utility app enables you to see and create new app bundles, activities and workitems - including  creating new version of those and aliases for them

### Thumbnail

![thumbnail](/thumbnail.png)

### Live version

[https://da-manager.autodesk.io/](https://da-manager.autodesk.io/)

# Usage

1. In the top text boxes Provide the **Client Id** and **Client Secret** of the app you created on the **Autodesk Developer Site** and click **Log In** button

2. On both the **AppBundles** and **Activities** tabs you'll find a list of all the items you have on APS.  \
In case of clicking on an **Alias**, the infomration box on the right will show the reply coming from the **APS** server. \
You'll find three buttons on the bottom left:
- **Refresh**: refreshes the content of the tree control on the left side
- **Create**: creates a new item. Depending on which item in the tree is selected it will create a different element: e.g. if an **Activity version** is selected then it will enable you to create an **Alias** for that version
- **Delete**: will try to delete the selected item

3. Whenever you use the **Create** button a dialog box will pop up that enables you to provide the necessary info in order to create the specific item:

![create appbundle](/readme/CreateAppBundle.png)

4. In the **Info** dialog box, some of the input fields will have a drop down menu with various functions:
- they might enable you to populate the control with some text - often these are just templates that need to be filled in with the relevant information
- verify if the input is a valid json:

![verify JSON](/readme/VerifyJson.png)

4. When an **Activity Alias** is selected in the tree, the plus button will turn into a **play/run** button showing that you could start a **Workitem** based on the selected **Activity**

5. Once you started a **Workitem** the **WorkItems** tab will be activated and it will show a list of the **Workitems** you started during this session \
There will be two buttons available:
- **Stop**: it will try to stop the selected **Workitem**
- **Delete**: it will remove the selected item from the list (it won't try to stop it)

![workitems](/readme/Workitems.png)

If you click any of the items then an update will be requested from the server and the reply will be shown in the info box

6. Whenever you are requested to provide a file (for an **AppBundle** or for a **Workitem**) you need to provide a publicly accessible **URL** to it \
One easy way to generate such **URLs** is to use the **APS OSS** and a utility like [https://oss-manager.autodesk.io](https://oss-manager.autodesk.io) to upload files and generate *read/write* **URLs** for them
![thumbnail](/readme/OssManagerPresignedUrl.png)

# Setup

## Prerequisites

1. **APS Account**: Learn how to create a APS Account, activate subscription and create an app at [this tutorial](https://tutorials.autodesk.io/). 
2. **Visual Studio**: Either Community (Windows) or Code (Windows, MacOS).
3. **JavaScript** basic knowledge with **jQuery**

### Run locally

Install [NodeJS](https://nodejs.org).

Clone this project or download it. It's recommended to install [GitHub desktop](https://desktop.github.com/). To clone it via command line, use the following (**Terminal** on MacOSX/Linux, **Git Shell** on Windows):

    git clone https://github.com/adamenagy/da.manager-nodejs

To run it, install the required packages, set the enviroment variables with your client ID & secret and finally start it. Via command line, navigate to the folder where this repository was cloned and use the following:

Mac OSX/Linux (Terminal) / Windows (use <b>Node.js command line</b> from Start menu)

    npm install
    npm start

Open the browser: [http://localhost:3000](http://localhost:3000).

**Important:** do not use **npm start** locally, this is intended for PRODUCTION only with HTTPS (SSL) secure cookies.

## Deployment

To deploy this application to Heroku, the **Callback URL** must use your `.herokuapp.com` address. After clicking on the button below, at the Heroku Create New App page, set your Client ID, Secret and Callback URL.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/adamenagy/da.manager-nodejs)

Watch [this video](https://www.youtube.com/watch?v=Oqa9O20Gj0c) on how deploy samples to Heroku.


## Packages used

All APS NPM packages are included by default, see complete list of what's available at [NPM website](https://www.npmjs.com/browse/keyword/autodesk). OAuth, Model Derivative and OSS are used. Some other non-Autodesk packaged are used, including [express](https://www.npmjs.com/package/express) and its session/cookie middlewares ([express-session](https://www.npmjs.com/package/express-session) and [cookie-parser](https://www.npmjs.com/package/cookie-parser)) for user session handling. The front-end uses [bootsrap](https://www.npmjs.com/package/bootstrap) and [jquery](https://www.npmjs.com/package/jquery).

## Tips & tricks

For local development/testing, consider use [nodemon](https://www.npmjs.com/package/nodemon) package, which auto restart your node application after any modification on your code. To install it, use:

    sudo npm install -g nodemon

Then, instead of <b>npm run dev</b>, use the following:

    npm run nodemon

Which executes **nodemon server.js --ignore www/**, where the **--ignore** parameter indicates that the app should not restart if files under **www** folder are modified.

## Further Reading

Documentation:

- [Design Automation API](https://aps.autodesk.com/en/docs/design-automation/v3/developers_guide/overview/)

Tutorials:

- [Modify your models](https://learnforge.autodesk.io/#/tutorials/modifymodels)
- [Step-by-Step Tutorials](https://aps.autodesk.com/en/docs/design-automation/v3/tutorials/)

Blogs:

- [APS Blog](https://aps.autodesk.com/blog)

## License

This sample is licensed under the terms of the [MIT License](http://opensource.org/licenses/MIT).
Please see the [LICENSE](LICENSE) file for full details.

## Written by

Adam Nagy (Autodesk Partner Development)<br />
http://aps.autodesk.com<br />
