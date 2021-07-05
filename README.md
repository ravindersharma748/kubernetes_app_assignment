# kubernetes_app_assignment

This Setup consists of a simple Nodejs application with mysql Database at backend, frontend part is a apache reverse proxy.

The Architecture diagram of this simple setup is as below:

![k8s_3tierapp](https://user-images.githubusercontent.com/44415163/124374101-fe62a100-dcb5-11eb-9b6f-1c8d0f7d21ee.png)


### kubernetes Cluster

I used kind to setup kubernetes 1 mater 2 worker node setup. kind yaml file used for the setup is kind-cluster-config.yaml.

```
kind create cluster --config kind-cluster-config.yaml --name kubernetes-app-assignment
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
 
 The last part to create this demo setup is 
 
### Let's Start Now

Instead of going forward, we will do the reverse engineering on it. Our workflow will be like below:

PV and PV claim ----> Mysql deployment ----> Mysql service (PV is persistent volume and PVC is persistent volume claim)

Here we will get Mysql service which is a headless service, so that we can supply it inside our Node js application connection string(index.js). The benifit of creating service is that you don't need to worry about the pod running behined it, pods are ephemeral but service will be always there with static IP even it has zero pod.

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
        name: mysql-app
        env:
          # Use secret in real usage
        - name: MYSQL_DATABASE
          value: node_db
        - name: MYSQL_PASSWORD
          value: password
        - name: MYSQL_ROOT_PASSWORD
          value: root
        - name: MYSQL_USER
          value: admin
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

Checking Mysql Database connectivity:

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

