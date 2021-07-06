# kubernetes_app_assignment

This Setup consists of a simple Nodejs application with mysql Database at backend, frontend part is a apache/nginx reverse proxy.

To Access the application, we will use Ingress URL. 

Application Ingress access URL's

DB endpoint : http://kubernetes.docker.internal/

Api endpoint: http://kubernetes.docker.internal/api

The Architecture diagram of this simple setup is as below:

![k8s_3tierapp](https://user-images.githubusercontent.com/44415163/124374101-fe62a100-dcb5-11eb-9b6f-1c8d0f7d21ee.png)


### kubernetes Cluster

I used kind to setup kubernetes 1 mater 2 worker node setup. kind yaml file used for the setup is kind-cluster-config.yaml.

```
kind create cluster --config kind-cluster-config.yaml
```

### Creating a local docker docker registry

We created our local docker registry for this demo setup. We created this registry using a script.

```
#!/bin/sh
reg_name='kind-registry'
reg_port='5000'
running="$(docker inspect -f '{{.State.Running}}' "${reg_name}" 2>/dev/null || true)"
if [ "${running}" != 'true' ]; then
  docker run \
    -d --restart=always -p "${reg_port}:5000" --name "${reg_name}" \
    registry:2
fi
```

Run this script to create a local repository:

```
./kind-local-registry.sh
```
 Now we created kind cluster to use this repository using config file local-registry.yaml
 
 ```
 kind create cluster --config local-registry.yaml
 ```
 
 
### Let's Start Now

Instead of going forward, we will do the reverse engineering on it. Our workflow will be like below:

PV and PV claim ----> Mysql deployment ----> Mysql service (PV is persistent volume and PVC is persistent volume claim)

Here we will get Mysql service which is a headless service, so that we can supply it inside our Node js application connection string(index.js). The benifit of creating service is that you don't need to worry about the pod running behined it, pods are ephemeral but service will be always there with static IP even it has zero pods.

Let's create what we discussed so far.

##### PV and PVClaim

```
$ cat mysql-pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mysql-pv-volume
  labels:
    type: local
spec:
  storageClassName: manual
  capacity:
    storage: 6Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/mnt/data"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pv-claim
spec:
  storageClassName: manual
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

##### Ouput

```
$ kubectl create -f mysql-pv.yml
persistentvolume/mysql-pv-volume created
persistentvolumeclaim/mysql-pv-claim created
``` 

#### Secrets and Configmap:

As username and passwords should be securly stored somewhere else so we will create configmap and Secrets.
Secrets and configmap are stored in mysql-secrets.yaml and mysql-configmap.yaml files respectively

```
$ kubectl apply -f mysql-secrets.yaml
secret/mysql-secret created
```

```
kubectl apply -f mysql-configmap.yaml
configmap/mysql-configmap created
```

##### Mysql Deployment

```
$ cat mysql-deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  ports:
  - port: 3306
  selector:
    app: mysql
  clusterIP: None
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
spec:
  selector:
    matchLabels:
      app: mysql
  strategy:
    type: Recreate
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - image: mysql:5.7
        name: mysql
        env:
          # Use secret in real usage
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: root_password
        - name: MYSQL_DATABASE
          valueFrom:
            configMapKeyRef:
              name: mysql-configmap
              key: db_name
        - name: MYSQL_PASSWORD
            secretKeyRef:
              name: mysql-secret
              key: password
        - name: MYSQL_USER
          valueFrom:
            configMapKeyRef:
              name: mysql-configmap
              key: db_user
        ports:
        - containerPort: 3306
          name: mysql
        volumeMounts:
        - name: mysql-persistent-storage
          mountPath: /var/lib/mysql
      volumes:
      - name: mysql-persistent-storage
        persistentVolumeClaim:
          claimName: mysql-pv-claim
```

##### Ouptput
```
$ kubectl apply -f mysql.yml
service/mysql created
deployment.apps/mysql created
```

##### Checking Mysql Database connectivity:

```
kubectl run -it --rm --image=mysql:5.6 --restart=Never mysql-client -- mysql -h mysql -u admin -pxxxxxxx
If you don't see a command prompt, try pressing enter.

mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| node_db            |
+--------------------+
2 rows in set (0.00 sec)
```


### Backend Application

Backend application is a simple Nodejs application.

The Backend deployment is store in node.yml file under Backend directory.

The nodejs application Dockerfile is stored under app directory.


### Frontend Nginx Proxy

Frontend Application is a simple nginx proxy, which pointing to DB and backend api endpoint.

All the frontend files are stored under Frontend directory.

### Ingress

We used Ingress so that we can access our application using some nice URL instead of using url:port pattern

Install Ingress using below config
```
 kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v0.41.2/deploy/static/provider/cloud/deploy.yaml
```

To route traffic we defined the paths in ingress.yaml file. 

```
kubectl apply -f ingress.yaml
```

##### Output of ingress URL's

![api_endpoint](https://user-images.githubusercontent.com/44415163/124577583-0748a380-de6b-11eb-99d6-3a7274164d80.PNG)

![DB_endpoint](https://user-images.githubusercontent.com/44415163/124577609-0dd71b00-de6b-11eb-8646-f152864fddbc.PNG)

