# Local devops

## Stand up Docker container:
```sh
docker run -d -it -p 8000-8020:8000-8020 -v "`pwd`/MarkLogic:/var/opt/MarkLogic" -e MARKLOGIC_INIT=true -e MARKLOGIC_ADMIN_USERNAME=admin -e MARKLOGIC_ADMIN_PASSWORD=admin --name moviepalace store/marklogicdb/marklogic-server:10.0-4-dev-centos
```

## Run the Data Hub UI
Start the UI:
```sh
cd datahub
java -jar marklogic-datahub-5.2.1.war
```
Go to http://localhost:8080  

## Run Pipes 
Initially and after every new version of Pipes, deploy the backend first:
```sh
cd pipes
java -jar marklogic-pipes-1.0.2-release.jar --deployBackend=true --mlUsername=admin --mlPassword=<password>
```
For regular use afterwards:
```sh
cd pipes
java -jar marklogic-pipes-1.0.2-release.jar
```
Go to http://localhost:8081

## Run Envision
Start the UI:
```sh
cd envision
java -DdhfDir=../datahub -jar envision-1.0.4.jar
```

## Initial deploy of the Data Hub to the MarkLogic database
```sh
cd datahub
./gradlew mlDeploy -PmlFlowOperatorPassword=FlowOp3r@tor -PmlFlowDeveloperPassword=FlowD3vel@per
```

## Subsequent deploys of the Data Hub
```sh
cd datahub
./gradlew mlRedeploy -PmlFlowOperatorPassword=FlowOp3r@tor -PmlFlowDeveloperPassword=FlowD3vel@per
```

In order to run a deployment of the configuration and code only (faster):
```sh
cd datahub
./gradlew mlReloadModules -PmlFlowOperatorPassword=FlowOp3r@tor -PmlFlowDeveloperPassword=FlowD3vel@per

```

## Load source data
```sh
cd datahub
./gradlew ingestCustomers -PmlUsername=flow-operator -PmlPassword=FlowOp3r@tor
./gradlew ingestRentals -PmlUsername=flow-operator -PmlPassword=FlowOp3r@tor
./gradlew ingestMarketing -PmlUsername=flow-operator -PmlPassword=FlowOp3r@tor
```
Or to load all data:
```sh
cd datahub
./gradlew ingestAll
```

## Harmonize customers and rentals
```sh
cd datahub
./gradlew hubRunFlow -PflowName=mapping -Psteps="1"
```

## Delete some data from collections
```sh
cd datahub
./gradlew mlDeleteCollections -Pdatabase=data-hub-STAGING -Pcollections=customers
./gradlew mlDeleteCollections -Pdatabase=data-hub-FINAL -Pcollections=Customer
```

## Generate a copy of the TDE for Mastered Data
This is needed so that the TDE can be filtered to only look at mastered data!
```sh
cd datahub
./gradlew hubGenerateTDETemplates -PentityNames=Customer
```
and then:
- Copy from `datahub/src/main/ml-config/databases/data-hub-final-SCHEMAS/schemas/tde` to `datahub/src/main/ml-schemas/tde`
- Rename to -MD
- Change the schema-name to Customer_MD
- Add a collection constraint like
```
<tde:collections>
    <tde:collection>sm-Customer-mastered</tde:collection>
</tde:collections>
```
Then load the schema using `./gradlew mlReloadSchemas`

## Fix issue that admin has no access to row-index anymore
Add `flow-developer-role` and `flow-operator-role` to `admin` user!

## Fasttrack
```sh
cd datahub
./gradlew mlClearDatabase -Pdatabase=data-hub-JOBS -Pconfirm=true
./gradlew mlClearDatabase -Pdatabase=data-hub-STAGING -Pconfirm=true
./gradlew mlClearDatabase -Pdatabase=data-hub-FINAL -Pconfirm=true
./gradlew mlDeploy -PmlFlowOperatorPassword=FlowOp3r@tor -PmlFlowDeveloperPassword=FlowD3vel@per
--- prepare until here ---
./gradlew ingestAll -PmlUsername=flow-operator -PmlPassword=FlowOp3r@tor
./gradlew hubRunFlow -PflowName=mapping -Psteps="1" -PmlUsername=flow-operator -PmlPassword=FlowOp3r@tor
./gradlew hubRunFlow -PflowName=mastering -Psteps="1,2,3" -PmlUsername=flow-operator -PmlPassword=FlowOp3r@tor
```

## Connect PBI in VirtualBox
Open DirectQuery connection to: 10.0.2.2:5432

# Data Hub Service

## Deployment
First try and test the deployment locally as a user that has the `data-hub-developer` role.  
Reason being that a hubDeploy to DHS wil be done without the `manage-admin` role while deploying with the `admin` role to DHF will essentially allow everything.  
Indexes are only deployed to DHS, not locally. Use `mlDeploy` instead!
```sh
./gradlew hubDeploy -PenvironmentName=local -PmlUsername=admin
```

Then if all is fine, deploy to DHS:
```sh
./gradlew hubDeploy -PenvironmentName=dhs -PmlUsername=flow-developer -pmlPassword=FlowD3vel@per
```

## Fasttrack
```sh
cd datahub
./gradlew mlClearDatabase -PenvironmentName=dhs -Pdatabase=data-hub-JOBS -Pconfirm=true
./gradlew mlClearDatabase -PenvironmentName=dhs -Pdatabase=data-hub-STAGING -Pconfirm=true
./gradlew mlClearDatabase -PenvironmentName=dhs -Pdatabase=data-hub-FINAL -Pconfirm=true
./gradlew hubDeployArtifacts -PenvironmentName=dhs
./gradlew hubDeploy -PenvironmentName=dhs -PmlUsername=flow-developer -PmlPassword=FlowD3vel@per
--- prepare until here ---
./gradlew ingestAll -PenvironmentName=dhs -PmlUsername=flow-operator -PmlPassword=FlowOp3r@tor
./gradlew hubRunFlow -PenvironmentName=dhs -PflowName=mapping -Psteps="1"
./gradlew hubRunFlow -PenvironmentName=dhs -PflowName=mastering -Psteps="1,2,3"
```

## Endpoints
### Data Hub Explorer
https://2vnz0g8e9.z.marklogicsvc.com:8020/browse

### Query Console
https://2vnz0g8e9.z.marklogicsvc.com:8003/qconsole/

### ODBC endpoint
2VNz0g8E9.z.marklogicsvc.com:5432 (ssl)

### Staging DB REST (Curation endpoint)
https://2vnz0g8e9.z.marklogicsvc.com:8010/v1/search
https://2vnz0g8e9.z.marklogicsvc.com:8011/v1/search?database=data-hub-STAGING
https://2vnz0g8e9.z.marklogicsvc.com:8011/v1/search?database=data-hub-STAGING&collection=AEKtoestel&q=Vaillant

### Final DB REST (Operations endpoint)
https://2vnz0g8e9.z.marklogicsvc.com:8011/v1/search

### Monitoring dashboard
https://2vnz0g8e9.z.marklogicsvc.com:8003/dashboard/

### History dashboard
https://2vnz0g8e9.z.marklogicsvc.com:8003/history/

### Management API
https://2vnz0g8e9.z.marklogicsvc.com:8003/manage/v2

### Jobs interface
:8013/#/
:8013/v1/search
:8012/v1/documents?database=data-hub-JOBS&uri=/jobs/8a827edf-9f8c-4bd0-981b-423ebb6a7f8c.json

### Logs
:8003/manage/v2/logs?format=html

### Check rights on a document
:8011/v1/documents?database=data-hub-MODULES&uri=/custom-modules/custom/MapAEKToKlant/main.sjs&category=permissions

# Tips & tricks

## Remove HSTS data from chrome
chrome://net-internals/#hsts
Delete 'z.marklogicsvc.com'