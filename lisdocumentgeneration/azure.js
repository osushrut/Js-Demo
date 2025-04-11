export async function uploadToAzure(component, awsUrl){
    let url = decodeURIComponent(awsUrl);
    console.log('Decoded URI: ' + url);
    if (url !== "undefined") {
        let trimmedUrl = url.split(".com/")[1];
        let finalUrl = trimmedUrl.substring(0, trimmedUrl.indexOf("?"));
        console.log('finalUrl: ' + finalUrl);

        let azureUploadURL = 
        "https://prod-50.westus.logic.azure.com:443/workflows/0c13a538cf124cd986d593683e263e2b/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=USVzK2JFg8I4BknAbyDVyxzShnw6Qr6fnVrAosTLxWE"                        

        const requestBody = {
            //checks: preppedCheckData
            templateId: ``,
            bucketName: `test-hmr-uat`,
            s3File: `${finalUrl}`
        };
            
        console.log('FULL REQUEST BODY TO AZURE in Azure.js: '+JSON.stringify(requestBody));
        const response = await fetch(azureUploadURL, {
            method: 'Post',
            headers: {
                'Content-Type': 'application/json',
                
            },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        console.log('Data from AZURE: '+JSON.stringify(data));
        console.log('File URL from AZURE: '+data.fileLink);
        //const docURL = "https://view.officeapps.live.com/op/view.aspx?src=" +data.fileLink;
        const docURL = data.fileLink;
        
        
        
        /*component.docURL = docURL; 
        component.showGenerateSpinner = false;                            
        component.disableNext = false;
        component.disablePrevious = false;
        component.proceedButtonLabel = 'Confirm & Next';

        // Hide step 4 and show step 5
        component.template.querySelector('.generating').classList.add('slds-hide');
        component.template.querySelector('.review').classList.remove('slds-hide');

        // Update current tab value
        
        component.currentTabValue = "2";
        console.log('CURRENT TAB VALUE FROM AWS.JS::::::::::::::: ' + component.currentTabValue);
        console.log('CURRENT BUTTON LABEL FROM AWS.JS::::::::::::::: ' + component.proceedButtonLabel);       */                      
        return docURL;
    }
}