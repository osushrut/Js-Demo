import { LightningElement, api, track, wire } from "lwc";
import {
  createJSON,
  handleRetrieveTemplateMappings,
  generateDocument,
  validatingData,
  launchDocumentModal,
  closeDocumentModal,
  downloadDocumentModal,
  initializeDocumentGeneration,
  handleSelectedDocuments,
  fetchGeneratedDocuments,
  handleNextStep,
} from "./AWS";
import { uploadToAzure } from "./Azure";

import systemStatusModal from "c/lISDocGenSystemStatusLWC";
import LightningModal from "lightning/modal";
import { loadScript } from "lightning/platformResourceLoader";
import AWS_SDK from "@salesforce/resourceUrl/AWSSDK";

//SECTION FOR FINAL APEX CALLS

//-----------------------------------------------------

import getDocumentTemplates from "@salesforce/apex/LISDocumentGeneration.getDocumentTemplates";
import getGeneratedDocuments from "@salesforce/apex/LISDocumentGeneration.getGeneratedDocuments";
import retrieveBoxFolder from "@salesforce/apex/LISDocumentGeneration.retrieveBoxFolder";
import getParentFolder from "@salesforce/apex/LISDocumentGeneration.getParentFolder";
import uploadFileToBox from "@salesforce/apex/LISDocumentGeneration.uploadFileToBox";
import uploadFileToBoxFromS3 from "@salesforce/apex/LISDocumentGeneration.uploadFileToBoxFromS3";
import createFRUP from "@salesforce/apex/LISDocumentGeneration.createFRUP";

import {
  getRecord,
  createRecord,
  updateRecord,
  getFieldValue,
} from "lightning/uiRecordApi";
import getAdvanceData from "@salesforce/apex/caseAdvancesController.getAdvanceData";
import getCaseData from "@salesforce/apex/caseAdvancesController.getCaseData";
import getAppData from "@salesforce/apex/caseAdvancesController.getAppData";
import getAdvanceLines from "@salesforce/apex/caseAdvancesController.getAdvanceLines";
import getSObjectAssociations from "@salesforce/apex/LISDocumentGeneration.getSObjectAssociations";
import getDocumentDetails from "@salesforce/apex/LISDocumentGeneration.getDocumentDetails";

import S3Setting from "@salesforce/apex/LISDocumentGeneration.getSettings";
import buildJSON from "@salesforce/apex/LISDocumentGeneration.buildJSON";
import getTemplateMappingsForDocument from "@salesforce/apex/LISDocumentGeneration.getTemplateMappingsForDocument";
import getDocumentIds from "@salesforce/apex/LISDocumentGeneration.getDocumentIds";
import getGeneratedStats from "@salesforce/apex/LISDocumentGeneration.getGeneratedStats";

import getAccessToken from "@salesforce/apex/communityController.getAccessToken";

import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { RefreshEvent } from "lightning/refresh";

import completeIcon from "@salesforce/contentAssetUrl/correctpng";
import alertIcon from "@salesforce/contentAssetUrl/alerticonpng";
import successIconpng from "@salesforce/contentAssetUrl/wordIconjpg";

import PLAINTIFF_CASE_ADVANCE_OBJECT from "@salesforce/schema/Plaintiff_Case_Advance__c";
import Box_Folder_ID from "@salesforce/schema/Plaintiff_Case_Advance__c.Box_Folder_ID__c";
import ID_FIELD from "@salesforce/schema/Plaintiff_Case_Advance__c.Id";
import MON_FEE_FIELD from "@salesforce/schema/Plaintiff_Case_Advance__c.Monthly_Usage_Fee_Pct__c";
import REQ_AMOUNT_FIELD from "@salesforce/schema/Plaintiff_Case_Advance__c.Requested_Amount__c";
import DIS_DISB_DATE_FEILD from "@salesforce/schema/Plaintiff_Case_Advance__c.Distribution_Disbursement_Date__c";
import ORIGINATION_FEE_FIELD from "@salesforce/schema/Plaintiff_Case_Advance__c.Origination_Fee_Pct__c";

import PLAINTIFF_CASE_OBJECT from "@salesforce/schema/Plaintiff_Case__c";
import CASE_ID_FIELD from "@salesforce/schema/Plaintiff_Case__c.Id";
import FIRST_NAME_FIELD from "@salesforce/schema/Plaintiff_Case__c.Plaintiff_First_Name__c";
import LAST_NAME_FIELD from "@salesforce/schema/Plaintiff_Case__c.Plaintiff_Last_Name__c";
import EMAIL_FEILD from "@salesforce/schema/Plaintiff_Case__c.Plaintiff_Email__c";
import STREET_FIELD from "@salesforce/schema/Plaintiff_Case__c.Plaintiff_Street_Address_1__c";
import CITY_FIELD from "@salesforce/schema/Plaintiff_Case__c.Plaintiff_City__c";
import STATE_FIELD from "@salesforce/schema/Plaintiff_Case__c.Plaintiff_State__c";
import POSTAL_FIELD from "@salesforce/schema/Plaintiff_Case__c.Plaintiff_Zip__c";

//IMPORT GENERATED DOCUMENT OBJECT
import GENERATED_DOCUMENT_OBJECT from "@salesforce/schema/Template_Record__c";
import TEMPLATE_ID_FIELD from "@salesforce/schema/Template_Record__c.Id";
import ADVANCE_ID_FIELD from "@salesforce/schema/Template_Record__c.Plaintiff_Case_Advance__c";
import FUNDING_APPLICATION_ID_FIELD from "@salesforce/schema/Template_Record__c.Funding_Application__c";
import PLAINTIFF_CASE_ID_FIELD from "@salesforce/schema/Template_Record__c.Plaintiff_Case__c";
import DOCUMENT_TEMPLATE_ID from "@salesforce/schema/Template_Record__c.Document_Template__c";
import OVERALL_STATUS_FIELD from "@salesforce/schema/Template_Record__c.Overall_Status__c";
import DOCUMENT_URL_FIELD from "@salesforce/schema/Template_Record__c.Document_URL__c";
import DOCUMENT_STATUS_FIELD from "@salesforce/schema/Template_Record__c.Document_Status__c";
import BOX_FILE_ID_FIELD from "@salesforce/schema/Template_Record__c.Box_File_ID__c";
import DOCUMENT_NAME_FIELD from "@salesforce/schema/Template_Record__c.Document_Name__c";
import SENT_BY_ID_FIELD from "@salesforce/schema/Template_Record__c.Sent_by_Box_ID__c";
import SIGN_REQUEST_FIELD from "@salesforce/schema/Template_Record__c.Sign_Request_ID__c";

//IMPORT CONTACT OBJECT
import CONTACT from "@salesforce/schema/Contact";
import CONTACT_ID from "@salesforce/schema/Contact.Id";
import CONTACT_EMAIL_FIELD from "@salesforce/schema/Contact.Email";

//RETRIEVE CURRENT USER INFORMATION
import Id from "@salesforce/user/Id";
import UserNameFIELD from "@salesforce/schema/User.Name";
import userEmailFIELD from "@salesforce/schema/User.Email";
import userIsActiveFIELD from "@salesforce/schema/User.IsActive";
import userAliasFIELD from "@salesforce/schema/User.Alias";
import userBoxFIELD from "@salesforce/schema/User.Box_User_ID__c";
import TickerSymbol from "@salesforce/schema/Account.TickerSymbol";

const API_URL = "https://api.box.com/2.0/";

const actions = [{ label: "Send to Sign", name: "sendToSign" }];

const columns = [
  {
    label: "Recipient",
    apiName: "Recipient__c",
    fieldType: "lookup",
    type: "lookup",
    objectName: "Document_Signers__c",
  },
  {
    label: "Email",
    apiName: "Signer_Email__c",
    fieldType: "text",
    type: "text",
    objectName: "Document_Signers__c",
  },
  {
    label: "Role",
    apiName: "Role__c",
    fieldType: "picklist",
    objectName: "Document_Signers__c",
  },
];

// Define stepList directly
export const stepList = [
  { label: "Select", value: "1" },
  { label: "Confirm", value: "2" },
  { label: "Validating", value: "3" },
  { label: "Generating", value: "4" },
  { label: "Review", value: "5" },
  { label: "Complete", value: "6" },
];

export const caseStepList = [
  { label: "Select", value: "1" },
  { label: "Generating", value: "2" },
  { label: "Review", value: "3" },
  { label: "Send Email", value: "4" },
  { label: "Complete", value: "5" },
];

export default class LISDocumentGenerationLWC extends LightningModal {
  //FINAL VARIABLES SECTION
  @api docGenTool;
  @api recordData = [];
  @api templateInfo = [];
  @track toolSelected;
  @track responseData = [];
  @track dataValidated = false;
  @track documentGenerated = false;

  //--------------------------------

  completeIcon = completeIcon;
  alertIcon = alertIcon;
  successIconpng = successIconpng;
  @api sourceType;
  @api recordId; //THE ACTUAL RECORD ID WHERE THE COMPONENT IS PLACED (MVP 1 = ADVANCE ID);
  @api objectApiName;
  @api fileID;
  @api source;
  @track filecontent;
  @api templates = [];

  @track modalTitle;
  @track showSpinner = false;
  @track generated = false;

  @track currentStep = "Select";
  showTypeVertNav = true;

  //@track stepList ="Select,Confirm,Validating,Generating,Review,Options,Approval,Complete";
  stepsArray;
  countToCurrent;
  countTotalSteps;
  @track selectedStep = "Step1";
  @track currentStepName = "";
  @track currentStepDescription = "";
  @track advanceCaseID;

  //PLAINTIFF INFORMATION
  @track plaintiffFirst;
  @track plaintiffLast;
  @track plaintiffEmail;
  @track plaintiffStreet;
  @track plaintiffCity;
  @track plaintiffState;
  @track plaintiffZip;

  //ATTORNEY INFORMATION
  @track attorneyId;
  @track attorneyFirst;
  @track attorneyLast;
  @track attorneyEmail;
  @track lawFirm;

  //ADVANCE INFORMATION
  @track advanceLines = [];
  @track advanceCase;
  @track advanceNumber;
  @track advanceAmount;
  @track advanceDisburse;
  @track advanceOrigination;
  @track advanceUseage;
  @api advanceType;
  @api recordType;
  @track tilesAreDraggable = true;
  @api advanceStatus;
  @track approved = false;
  @track disableGenerate = false;

  @track proceedButtonLabel = "Next";
  @track proceedBoxNextLabel = "Save & Next";
  @track disableNext = false;
  @track disablePrevious = false;
  @track showNext = true;
  @track showPrevious = false;
  @track documentTempID;
  @track fileData;
  @track iconName = "standard:contract";
  @track stepName = "Select Document";
  @track showProgress = false;
  isSelected = false;

  //Template Mapping Fields
  @track name;
  @track fieldName;
  @track templateTag;
  @track documentName;
  @track TemplateMappingsForDocument;
  @track sourceType;
  @track showValidateSpinner = false;
  @track showGenerateSpinner = false;
  @track showBoxSpinner = false;
  @track currentTabValue = "1";
  @track errorData = [];
  @track validateErrorMessage =
    "VALIDATION FAILED FOR THE FOLLOWING REASON(S):";
  @track validateError = false;
  @track generateErrorMessage =
    "DOCUMENT GENERATION FAILED FOR THE FOLLOWING REASON(S):";
  @track generateError = false;
  @track generateErrorData = [];
  @track isValid = false;
  @track objectAssociations;
  @track imageUrl;
  @track requiresValidation = false;
  @track showValidation = false;
  @track showOptions = false;
  @track showComplete = false;
  @track jsonBody;
  @track documentData = [];
  @track generated = false;
  @track documentIds = [];
  @track objectName;
  @api templateId;
  @track filePreviewUrl;
  @track extensionType;
  @track extensionIcon;
  @track documentLabel = "Select";
  @track documentVariant = "brand-outline";
  @track documentIcon = "utility:add";
  @track docURL;
  templateMappings;
  queryRelatedData;

  //FOR APPROVAL PAGE
  @track generatedBy;
  @track generatedDate;
  @track documentStatus;
  @track pendingApprovalFrom;
  @track tempData = [];

  //USER DATA
  @track error;
  @track userId = Id;
  @track currentUserName;
  @track currentUserEmail;
  @track currentIsActive;
  @track currentUserAlias;
  @track currentUserBoxId;

  //AWS S3 AND INTEGRATION VARIALBES
  @api currentRecordId;
  selectedFilesToUpload;
  @track awsSettingRecordId = "";
  @track isAwsSdkInitialized = false;
  @track fileName;
  @track s3bucketURI = "";
  @track s3Bucket = "";
  @track s3;
  @track presignedGETURL = "";
  @track uploadDisabled = true;

  //BOX SIGN AND INTEGRATION VARIABLES
  @track signatureStatusDocs = [];
  @track documentRequestStatuses = [];
  @track retrievingData = false;
  @track boxFileId;
  @track boxApiData = [];
  @track boxApiSigners = [];
  @track jsonData = [];
  @track jsonSigner = [];
  @track jsonTEMP = [];
  @track disableResendButton = false;
  @track disableCancelButton = false;
  @track launchBox = false;
  @track documentName;
  @track boxApiToken;
  @track boxData = [];
  @track signersLoaded = false;
  @track retrievingStatus = false;
  @track showSignerPrevious = false;
  @track signerData = [];
  @track emailSubject = "";
  @track emailMessage = "";
  @track recipientName;
  @track recipientEmail;
  @track data = {};

  @track preparationOptions = [
    { label: "Yes", value: "yes" },
    { label: "No", value: "no" },
  ];

  @track reminderOptions = [
    { label: "Yes", value: "yes" },
    { label: "No", value: "no" },
  ];

  //BOX API VARIABLES
  @track launchDocuments = false;
  @track signVariant = "";
  @track uploadVariant = "";
  @track apiVariant = "";
  @track apiStatus = "";
  @track signApiStatus = "";
  @track uploadApiStatus = "";
  @track apiStatusClass = "";
  @track signStatusClass = "";
  @track uploadStatusClass = "";

  get acceptedFormats() {
    return [".docx", ".doc"];
  }

  @track documentColumns = [
    {
      label: "Name",
      fieldName: "Document_Name__c",
      type: "text",
      cellAttributes: {
        class: "slds-text-title_caps",
        alignment: "center",
      },
    },
    {
      label: "Generated Date",
      fieldName: "CreatedDate",
      initialWidth: 150,
      type: "date-local",
      typeAttributes: {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      },
      cellAttributes: {
        class: "slds-text-title_caps",
        alignment: "left",
      },
    },

    {
      label: "Status",
      fieldName: "Document_Status__c",
      initialWidth: 200,
      type: "text",
      cellAttributes: {
        class: "slds-text-title_caps",
        alignment: "center",
      },
    },

    {
      type: "button",
      initialWidth: 200,
      //label: 'Delete',
      cellAttributes: {
        alignment: "center",
      },
      //iconName: 'utility:edit',
      typeAttributes: {
        label: { fieldName: "buttonLabel" },
        disabled: { fieldName: "sendSignDisabled" },
        name: "sendToSign",
        rowActions: actions,
        title: "boxsign",
        iconName: { fieldName: "sendSignIcon" },
        iconPosition: "right",
        variant: { fieldName: "sendSignVariant" },
      },
    },
  ];

  @track boxColumns = [
    {
      label: "Name",
      fieldName: "box__Name__c",
      type: "Text",
      class: "slds-text-title_caps",
      cellAttributes: {
        class: "slds-text-title_caps",
        alignment: "left",
      },
    },
    {
      label: "# of Signers",
      fieldName: "Total_Signers__c",
      type: "Text",
      class: "slds-text-title_caps",
      cellAttributes: {
        class: "slds-text-title_caps",
        alignment: "left",
      },
    },
    {
      label: "Overall Status",
      fieldName: "box__Status__c",
      class: "slds-text-title_caps",
      type: "Text",
      cellAttributes: {
        class: "slds-text-title_caps",
        iconName: { fieldName: "iconName" },
        iconPosition: "left",
      },
    },
  ];

  @track signerColumns = [
    {
      label: "Signer Email",
      //fieldName: 'box__Name__c',
      fieldName: "email",
      type: "Text",
      class: "slds-text-title_caps",
      cellAttributes: {
        class: "slds-text-title_caps",
        alignment: "left",
      },
    },
    {
      label: "Sign Order",
      fieldName: "order",
      type: "number",
      cellAttributes: {
        class: "slds-text-title_caps",
        alignment: "left",
      },
    },
    {
      label: "Role",
      //fieldName: 'box__Status__c',
      fieldName: "Role",
      type: "text",
      cellAttributes: {
        class: "slds-text-title_caps",
        alignment: "left",
      },
    },
    {
      label: "Signer Status",
      //fieldName: 'box__Status__c',
      fieldName: "Status",
      type: "text",
      cellAttributes: {
        class: "slds-text-title_caps",
        alignment: "left",
      },
    },
  ];

  @track columns = columns;

  @wire(getRecord, {
    recordId: Id,
    fields: [
      UserNameFIELD,
      userEmailFIELD,
      userIsActiveFIELD,
      userAliasFIELD,
      userBoxFIELD,
    ],
  })
  currentUserInfo({ error, data }) {
    if (data) {
      this.currentUserName = data.fields.Name.value;
      this.currentUserEmail = data.fields.Email.value;
      this.currentIsActive = data.fields.IsActive.value;
      this.currentUserAlias = data.fields.Alias.value;
      this.currentUserBoxId = data.fields.Box_User_ID__c.value;
      console.log("USER BOX ID: " + this.currentUserBoxId);
    } else if (error) {
      this.error = error;
    }
  }

  handleAddressChange(event) {
    this.plaintiffStreet = event.target.street;
    this.plaintiffCity = event.target.city;
    this.plaintiffState = event.target.province;
    this.plaintiffZip = event.target.postalCode;
    this.plaintiffCountry = event.target.country;

    console.log("PLAINTIFF STREET: " + this.plaintiffStreet);
    console.log("PLAINTIFF CITY: " + this.plaintiffCity);
    console.log("PLAINTIFF STATE: " + this.plaintiffState);
    console.log("PLAINTIFF ZIP: " + this.plaintiffZip);
  }

  resetIndicatorToBeginning() {
    this.currentStep = this.stepList.split(",")[0];
    this.establishSteps(this.currentStep);
  }

  /********************************************************************************************
DOCGEN 2.0 METHODS AND FUNCTIONS
********************************************************************************************/

  connectedCallback() {
    console.log(
      "Reading DocGenTool Data from LISDocGenLWC: " +
        JSON.stringify(this.docGenTool)
    );
    console.log(
      "Templates passed from LISDocGenLWC: " + JSON.stringify(this.templates)
    );
    this.docGenEndpoint = this.docGenTool.API_Endpoint__c;

    // ESTABLISH THE STEPS ARRAY
    /* if(this.templateInfo.Requires_Data_Validation__c == true){
        this.stepsArray = stepList;
       
    } else {
        this.stepsArray = caseStepList;
    }*/

    console.log(
      "LISDocumentGenerationLWC.JS - FINAL STEP ARRAY: " +
        JSON.stringify(this.stepsArray)
    );
    console.log(
      "LISDocumentGenerationLWC objectApiName: " + this.objectApiName
    );
    console.log(
      "Reading Record Data from LISDocGenLWC: " +
        JSON.stringify(this.recordData)
    );
    console.log(
      "Reading Template Info from LISDocGenLWC: " +
        JSON.stringify(this.templateInfo)
    );

    if (this.objectApiName == "Plaintiff_Case_Advance__c") {
      this.plaintiffFirst =
        this.recordData.Plaintiff_Case__r.Plaintiff_First_Name__c;
      this.plaintiffLast =
        this.recordData.Plaintiff_Case__r.Plaintiff_Last_Name__c;
      this.plaintiffEmail =
        this.recordData.Plaintiff_Case__r.Plaintiff_Email__c;
      this.plaintiffStreet =
        this.recordData.Plaintiff_Case__r.Plaintiff_Street_Address_1__c;
      this.plaintiffCity = this.recordData.Plaintiff_Case__r.Plaintiff_City__c;
      this.plaintiffState =
        this.recordData.Plaintiff_Case__r.Plaintiff_State__c;
      this.plaintiffZip = this.recordData.Plaintiff_Case__r.Plaintiff_Zip__c;
      this.attorneyId = this.recordData.Plaintiff_Case__r.Attorney__r.Id;
      this.attorneyEmail = this.recordData.Plaintiff_Case__r.Attorney__r.Email;
      this.advanceAmount = this.recordData.Requested_Amount__c;
      this.advanceDisburse = this.recordData.Distribution_Disbursement_Date__c;
      this.advanceOrigination = this.recordData.Origination_Fee_Pct__c;
      this.advanceUseage = this.recordData.Monthly_Usage_Fee_Pct__c;
      this.advanceCaseID = this.recordData.Plaintiff_Case__c;

      if (!this.recordData.Box_Folder_ID__c) {
        console.log("NO BOX FOLDER FOR THIS ADVANCE HAS BEEN FOUND");
        getAccessToken({}).then((result) => {
          this.boxApiToken = result;
          console.log(
            "ACCESS TOKEN RETRIEVED FOR SIGN REQUEST API: " + this.boxApiToken
          );
          this.createBoxFolder();
        });
      } else if (this.recordData.Box_Folder_ID__c) {
        console.log(
          "Box Folder has been located ==> FolderId: " +
            this.recordData.Box_Folder_ID__c
        );
        this.boxFolderId = this.recordData.Box_Folder_ID__c;
      }
    } else {
    }

    if (this.recordData.Type__c) {
      this.recordType = this.recordData.Type__c;
    } else {
      this.recordType = null;
    }

    //GET TEMPLATE MAPPINGS FOR DOCUMENT:
    getTemplateMappingsForDocument({
      s3DocumentIds: this.documentTempID,
      objectName: this.objectApiName,
      recordId: this.recordId,
    })
      .then((result) => {
        console.log("DOCUMENT TEMPLATE MAPPING:: " + result);
        this.jsonBody = result;

        if (result) {
          this.templateMappings = result;
          this.generateDocument();
        } else {
          this.generateError = true;
          this.generateErrorMessage =
            "There is no Template Mappings configured for this document.";
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }

  // HANDLES GETTING TEMPLATE INFO WHEN SELECTING DOCUMENT TO GENERATE
  selectedDocuments(event) {
    this.isSelected = !this.isSelected;
    if (this.isSelected == true) {
      this.documentLabel = "Selected";
      this.documentIcon = "utility:check";
      console.log(
        "Selected Template Data: " + JSON.stringify(event.currentTarget.value)
      );
      this.templateInfo = event.currentTarget.value;
      this.templateId = this.templateInfo.Id;
      this.documentTempID = this.templateInfo.S3_Document_ID__c;
      this.queryRelatedData = this.templateInfo.Query_Related_Data__c;
      console.log(
        "LISDocumentGeneration --> Setting Template Info: " +
          JSON.stringify(this.templateInfo)
      );

      // ESTABLISH THE STEPS ARRAY
      if (this.templateInfo.Requires_Data_Validation__c == true) {
        this.stepsArray = stepList;
        this.showProgress = true;
        this.handleNext();
      } else {
        this.stepsArray = caseStepList;
        this.showProgress = true;
        this.handleNext();
      }
    } else {
      this.documentLabel = "Select";
      this.documentIcon = "utility:add";
      this.showProgress = false;
    }
  }

  handlePlaintiffFirst(event) {
    this.plaintiffFirst = event.target.value;
  }
  handlePlaintiffLast(event) {
    this.plaintiffLast = event.target.value;
  }
  handlePlaintiffEmail(event) {
    this.plaintiffEmail = event.target.value;
  }
  handleAttEmail(event) {
    this.attorneyEmail = event.target.value;
  }

  handleDisburseDate(event) {
    this.advanceDisburse = event.target.value;
  }
  handleOrigination(event) {
    this.advanceOrigination = event.target.value;
  }
  handleRequestedAmount(event) {
    this.advanceAmount = event.target.value;
  }
  handleMonthlyFee(event) {
    this.advanceUseage = event.target.value;
  }

  @track genOneComplete = false;

  async handleNext() {
    if (this.templateInfo.Requires_Data_Validation__c == true) {
      if (this.currentTabValue === "1") {
        getAdvanceLines({ advID: this.recordId }).then((result) => {
          console.log(
            "Returned LINE Results FROM LISDocumentGenerationLWC.JS: " +
              JSON.stringify(result)
          );
          this.advanceLines = result;
          this.stepName = "Confirm Data";
          this.currentTabValue = "2";
          this.showPrevious = true;
          this.template.querySelector(".select").classList.add("slds-hide");
          this.template.querySelector(".confirm").classList.remove("slds-hide");
        });
      } else if (this.currentTabValue === "2") {
        this.showPrevious = false;
        this.updateRecords();
      } else if (this.currentTabValue === "3") {
        this.stepName = "Validating";
        this.showValidateSpinner = true;
        this.template.querySelector(".confirm").classList.add("slds-hide");
        this.template
          .querySelector(".validating")
          .classList.remove("slds-hide");

        if (this.templateInfo.Requires_Data_Validation__c == true) {
          console.log("EXECUTE DATA VALIDATION");

          let validated = validatingData(this);

          if (validated == true) {
            console.log(
              "AWS.JS SAYS DATA VALIDATION COMPLETED ==> Calling handleRetrieveTemplateMappings"
            );
            handleRetrieveTemplateMappings(this);
          }
        } else {
        }
      } else if (this.currentTabValue === "4") {
        if (this.templateMappings) {
          this.showValidateSpinner = false;
          this.stepName = "Generating";
          this.showGenerateSpinner = true;
          this.template.querySelector(".validating").classList.add("slds-hide");
          this.template
            .querySelector(".generating")
            .classList.remove("slds-hide");
          let response = await generateDocument(this);

          this.responseData = JSON.stringify(response);
          console.log(
            "Document Generated Successfully from AWS.JS ==> " +
              JSON.stringify(response)
          );
          if (response) {
            //this.docURL = "https://view.officeapps.live.com/op/view.aspx?src="+encodeURIComponent(response.signedURL);
            let azureURL = await uploadToAzure(this, response.signedURL);
            console.log("Returned AZURE Link: " + azureURL);
            this.docURL = azureURL;
            console.log("docURL: " + this.docURL);

            this.uploadFileFromURLToBox(response.signedURL);

            this.showGenerateSpinner = false;
            this.disablePrevious = false;
            this.disableNext = false;
            this.currentTabValue = "5";
            this.stepName = "Review";
            this.template
              .querySelector(".generating")
              .classList.add("slds-hide");
            this.template
              .querySelector(".review")
              .classList.remove("slds-hide");
          }
        } else {
          console.log("FAILED to get Template Mappings for Document::");
        }
      } else if (this.currentTabValue == "5") {
        this.stepName = "Complete";
        this.currentTabValue = "6";
        this.proceedButtonLabel = "Finish";
        this.showPrevious = false;
        this.template.querySelector(".review").classList.add("slds-hide");
        this.template.querySelector(".complete").classList.remove("slds-hide");
      } else if (this.currentTabValue == "6") {
        this.insertDocumentRecord();
      }
    } else {
      let jsonCreated = createJSON(this);
      console.log("Document Generated: " + jsonCreated);
    }
  }

  async uploadFileFromURLToBox(azureURL) {
    // Define the Box API endpoint and method
    const boxAPIEndpoint = `https://api.box.com/2.0/files/content?parent_id=${this.boxFolderId}`;
    const method = "POST";

    // Get the file content from the Azure URL
    const response = await fetch(azureURL);
    const content = await response.blob();

    // Create a Blob from the file content
    const fileBlob = new Blob([content], { type: "application/octet-stream" });

    // Create a FormData object to send the file content to Box
    const formData = new FormData();
    formData.append("file", fileBlob);

    // Set the request headers
    const headers = {
      "Content-Type": "ultipart/form-data",
      Authorization: `Bearer ${this.boxApiToken}`,
      mode: "no-cors",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Expose-Headers": "*",
    };

    // Send the request to Box
    const uploadRequest = new Request(boxAPIEndpoint, {
      method,
      body: formData,
      headers,
    });
    const uploadResponse = await fetch(uploadRequest);

    // Check the upload status
    if (uploadResponse.ok) {
      console.log("File uploaded successfully to Box");
    } else {
      console.error("Failed to upload file to Box");
    }
  }

  handlePrevious() {
    if (this.currentTabValue === "2") {
      this.stepName = "Select Document";
      this.iconName = "standard:contract";
      this.template.querySelector(".stepTwo").classList.add("slds-hide");
      this.template.querySelector(".stepOne").classList.remove("slds-hide");
      let currentStep = "Select";
      this.establishSteps(currentStep);
      this.proceedButtonLabel = "Next";
      this.currentTabValue = "1";
    }
    if (this.currentTabValue === "3") {
      this.validateErrorMessage =
        "VALIDATION FAILED FOR THE FOLLOWING REASON(S):";
      this.validateError = false;

      this.stepName = "Confirm Critical Data";
      this.iconName = "standard:contact";
      this.proceedButtonLabel = "Save & Next";
      let currentStep = "Confirm";
      this.establishSteps(currentStep);
      this.template.querySelector(".stepThree").classList.add("slds-hide");
      this.template.querySelector(".stepTwo").classList.remove("slds-hide");
      this.disableNext = false;
      this.currentTabValue = "2";
    }
    if (this.currentTabValue === "4") {
      this.generateErrorMessage =
        "DOCUMENT GENERATION FAILED FOR THE FOLLOWING REASON(S):";
      this.generateError = false;

      this.stepName = "Confirm Critical Data";
      this.iconName = "standard:contact";
      this.proceedButtonLabel = "Save & Next";
      let currentStep = "Confirm";
      this.establishSteps(currentStep);
      this.template.querySelector(".step4").classList.add("slds-hide");
      this.template.querySelector(".stepTwo").classList.remove("slds-hide");
      this.disableNext = false;
      this.currentTabValue = "2";
    }

    if (this.currentTabValue === "5") {
      this.showValidateSpinner = false;
      this.stepName = "Confirm Critical Data";
      this.iconName = "standard:contact";
      this.proceedButtonLabel = "Save & Next";
      let currentStep = "Confirm";
      this.establishSteps(currentStep);
      this.template.querySelector(".stepFive").classList.add("slds-hide");
      this.template.querySelector(".stepTwo").classList.remove("slds-hide");

      this.currentTabValue = "2";
    }
  }

  @track stats = [];

  getDocTemplates() {
    // TODO: Get selected document templates from the UI
    return this.documentTemplates && this.documentTemplates.data.length > 0;
  }

  handleRetrieveTemplateMappings() {
    this.showGenerateSpinner = true;

    getDocumentIds({ usedFor: this.sourceType })
      .then((result) => {
        this.documentIds = result;
        console.log("Retrieved Document IDs: " + JSON.stringify(result));
        if (this.documentIds.length > 0) {
          getTemplateMappingsForDocument({
            s3DocumentIds: this.documentTempID,
            objectName: this.objectApiName,
            recordId: this.recordId,
          })
            .then((result) => {
              console.log("JSON RESULT:: " + result);
              this.jsonBody = result;

              if (result) {
                console.log(
                  "RESULT OF TEMPLATE MAPPING: " + JSON.stringify(result)
                );
                this.templateMappings = result;
                this.generateDocument();
              } else {
                this.generateError = true;
                this.generateErrorMessage =
                  "There is no Template Mappings configured for this document.";
              }
              console.log(
                "RESULT OF TEMPLATE MAPPING: " + JSON.stringify(result)
              );
            })
            .catch((error) => {
              console.error(error);
            });
        } else {
          this.generateError = true;
          this.generateErrorMessage =
            "There is no S3 Configuration for this object type. Please contact your System Administrator";
        }
      })
      .catch((error) => {
        console.error("Error retrieving document IDs:", error);
      });
  }

  generateDocuments() {
    this.advanceEdit = false;
    this.currentStep = "Select";
    console.log("LAUNCHING DOCUMENT GENERATION MODAL...");
    //this.disableNext = true;
    this.documentLabel = "Select";
    this.proceedButtonLabel = "Next";
    this.showPrevious = false;
    this.documentVariant = "brand-outline";
    this.documentIcon = "utility:add";
    //this.launchDocuments = true;
    launchDocumentModal(this);
  }

  closeDocuments() {
    console.log("CLOSING DOCUMENT GENERATION MODAL...");
    closeDocumentModal(this);
  }

  downloadDocument() {
    console.log("DOWNLOAD DOCUMENT FROM MAIN JS :");
    downloadDocumentModal(this);
    //window.open(filePreviewUrl, "_blank");
  }

  //HANDLES THE UPLOADED FILE FROM THE FILE UPLOADER ON SCREEN
  handleSelectedFiles(event) {
    console.log("EXECUTING POST UPLOAD FUNCTION");
    if (event.target.files.length > 0) {
      this.selectedFilesToUpload = event.target.files[0];
      console.log(
        "UPLOADED FILE DETAILS =====> " +
          JSON.stringify(this.selectedFilesToUpload)
      );
      let date = new Date().toJSON();
      this.fileName = event.target.files[0].name;
      this.uploadDisabled = false;
      console.log("fileName ====> " + this.fileName);
      this.revisedDocument = true;
      this.uploadToAWS();
    }
  }

  @track parentFolder;
  @track recordName;
  @track disableRefresh = true;
  createBoxFolder() {
    getParentFolder({ recordId: this.recordId }).then((result) => {
      let type = this.recordData.Type__c;
      console.log("Source Type: " + type);
      if (type === "Advance") {
        this.parentFolder =
          result[0].Plaintiff_Case__r.Advances_Box_Folder_ID__c;
        var recName = result[0].Name;
        var lastFive = recName.substr(recName.length - 5);
        this.recordName = "Advance-" + lastFive;
        console.log("parentFolder ADV Variable: " + this.parentFolder);
        console.log("recordName: " + this.recordName);
      } else if (type === "Case Costs") {
        this.parentFolder =
          result[0].Plaintiff_Case__r.Case_Costs_Box_Folder_ID__c;
        var recName = result[0].Name;
        var lastFive = recName.substr(recName.length - 5);
        this.recordName = "Case Costs-" + lastFive;
        console.log("parentFolder CC Variable: " + this.parentFolder);
        console.log("recordName: " + this.recordName);
      }

      this.executeBoxFolder();
    });
  }

  async executeBoxFolder() {
    var bearer = "Bearer " + this.boxApiToken;
    console.log("BEARER: " + bearer);
    const response = await fetch(API_URL + "folders", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.boxApiToken,
        "Content-Type": "application/json",
        "as-user": this.currentUserBoxId,
      },
      //headers: myHeaders,
      body: `{"name": \"${this.recordName}"\,"parent":{"id":\"${this.parentFolder}"\}}`,
    });
    const boxResponse = await response.json();
    console.log("CREATED BOX FOLDER: " + JSON.stringify(boxResponse));
    const boxId = boxResponse.id;

    const fields = {};
    fields[ID_FIELD.fieldApiName] = this.recordId;
    fields[Box_Folder_ID.fieldApiName] = boxId;

    const objRecordInput = { fields };
    updateRecord(objRecordInput).then((response) => {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Box Folder Created",
          message: `We created a folder for this Advance in Box.`,
          variant: "success",
        })
      );
    });
  }

  async openSystemStatus() {
    const result = await systemStatusModal.open({
      size: "small",

      onselect: (e) => {
        // stop further propagation of the event
        e.stopPropagation();
        this.handleConfirmEvent(e.detail);
      },
    });
    // if modal closed with X button, promise returns result = 'undefined'
    // if modal closed with OK button, promise returns result = 'okay'
  }

  //FINAL FUNCTIONS FOR DOCGEN 2.0

  updateRecords() {
    const fields = {};
    fields[CASE_ID_FIELD.fieldApiName] = this.advanceCaseID;
    fields[FIRST_NAME_FIELD.fieldApiName] = this.plaintiffFirst;
    fields[LAST_NAME_FIELD.fieldApiName] = this.plaintiffLast;
    fields[STREET_FIELD.fieldApiName] = this.plaintiffStreet;
    fields[CITY_FIELD.fieldApiName] = this.plaintiffCity;
    fields[STATE_FIELD.fieldApiName] = this.plaintiffState;
    fields[POSTAL_FIELD.fieldApiName] = this.plaintiffZip;
    fields[EMAIL_FEILD.fieldApiName] = this.plaintiffEmail;

    const recordInput = { fields };

    console.log("UPDATING CASE....FROM AWS.JS" + JSON.stringify(recordInput));
    updateRecord(recordInput).then((result) => {
      console.log("CASE INFO UPDATED FROM AWS.JS: " + JSON.stringify(result));
      const fields = {};
      fields[CONTACT_ID.fieldApiName] = this.attorneyId;
      fields[CONTACT_EMAIL_FIELD.fieldApiName] = this.attorneyEmail;
      const atorneyInput = { fields };

      console.log(
        "UPDATING ATTORNEY....FROM AWS.JS" + JSON.stringify(recordInput)
      );
      updateRecord(atorneyInput).then((result) => {
        const fields = {};
        fields[ID_FIELD.fieldApiName] = this.recordId;
        fields[DIS_DISB_DATE_FEILD.fieldApiName] = this.advanceDisburse;
        fields[ORIGINATION_FEE_FIELD.fieldApiName] = this.advanceOrigination;
        fields[MON_FEE_FIELD.fieldApiName] = this.advanceUseage;
        fields[REQ_AMOUNT_FIELD.fieldApiName] = this.advanceAmount;
        const advancedInput = { fields };

        console.log(
          "UPDATING ADVANCE....FROM AWS.JS" + JSON.stringify(recordInput)
        );
        updateRecord(advancedInput).then((result) => {
          this.currentTabValue = "3";
          this.handleNext();
        });
      });
    });
  }

  openFile(event) {
    window.open(this.docURL, "_blank");
  }

  insertDocumentRecord() {
    console.log(
      "ResponseData Passed for Document Insert: " + this.responseData
    );

    const currentDate = new Date();
    const formattedDate = currentDate
      .toLocaleDateString("en-US")
      .replace(/\//g, "-");
    const formattedTime = currentDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const formattedDateTime = `${formattedDate}, ${formattedTime}`;

    console.log(
      "PROPOSED DOC NAME: " +
        this.plaintiffLast +
        ", " +
        this.plaintiffFirst +
        " - HMRS-$" +
        this.advanceAmount +
        "," +
        formattedDateTime +
        "." +
        this.extensionType
    );
    let tempFileName =
      this.plaintiffLast +
      "," +
      this.plaintiffFirst +
      "-HMRS-$" +
      this.advanceAmount +
      "," +
      formattedDateTime +
      "." +
      this.extensionType;
    let tempFileNameDate = tempFileName.replace(" ", "");
    let fileName = tempFileNameDate.replace(":", "-");
    console.log("NEW DOC NAME: " + fileName);
    console.log("DocURL: " + this.docURL);
    console.log("TemplateId: " + this.templateId);
    console.log("objectApiName: " + this.objectApiName);

    const fields = {};

    fields[DOCUMENT_URL_FIELD.fieldApiName] = this.docURL;
    fields[DOCUMENT_TEMPLATE_ID.fieldApiName] = this.templateId;
    fields[DOCUMENT_NAME_FIELD.fieldApiName] = fileName;

    // Set fields based on objectApiName
    if (this.objectApiName === "Plaintiff_Case_Advance__c") {
      fields[DOCUMENT_STATUS_FIELD.fieldApiName] = "Pending Approval";
      fields[ADVANCE_ID_FIELD.fieldApiName] = this.recordId;
      //fields[BOX_FILE_ID_FIELD.fieldApiName] = boxFileId;
    } else if (this.objectApiName === "Plaintiff_Case__c") {
      fields[DOCUMENT_STATUS_FIELD.fieldApiName] = "Approved";
      fields[PLAINTIFF_CASE_ID_FIELD.fieldApiName] = this.recordId;
      //fields[BOX_FILE_ID_FIELD.fieldApiName] = boxFileId;
    }

    const objRecordInput = {
      apiName: GENERATED_DOCUMENT_OBJECT.objectApiName,
      fields,
    };
    console.log("Creating record with input:", JSON.stringify(objRecordInput));

    // Create a record in Salesforce
    return createRecord(objRecordInput)
      .then((response) => {
        console.log("Generated document record ID: ", response.id);
      })
      .catch((error) => {
        console.error("Error creating document record:", JSON.stringify(error));
        console.error("Error details:", error.body.message);
        throw error;
      });
  }
}
