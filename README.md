# kubernetes_app_assignment

This Setup consists of a simple Nodejs application with mysql Database at backend, frontend part is a apache reverse proxy.

The Architecture diagram of this simple setup is as below:

![k8s_3tierapp](https://user-images.githubusercontent.com/44415163/124288575-f3e9bf80-db6e-11eb-8887-8e66745cf9a6.png)

### Let's Start Now

Instead of going forward, we will do the reverse engineering on it. Our workflow will be like below:

PV and PV claim ----> Mysql deployment ----> Mysql service (PV is persistent volume and PVC is persistent volume claim)

Here we will get Mysql service IP, so that we can supply it inside our Node js application connection string(index.js). The benifit of creating service is that you don't need to worry about the pods running behined it, pods are epermal but service will be always there with static IP whether it has zero or more pods.

Let's create what we discussed so far.

##### PV and PVClaim

```
$ cat mysql-pv.yml
kind: PersistentVolume
apiVersion: v1
metadata:
  name: mysql-pv-volume
  labels:
    type: local
spec:
  storageClassName: cinder-high-speed
  capacity:
    storage: 6Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/data"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pv-claim
spec:
  storageClassName: cinder-high-speed
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


