pipeline {
    agent {
        kubernetes {
            yaml '''
            apiVersion: v1
            kind: Pod
            spec:
              securityContext:
                runAsNonRoot: true
                runAsUser: 1000
              containers:
              - name: nodejs
                image: node:18-alpine
                command:
                - cat
                tty: true
                securityContext:
                  allowPrivilegeEscalation: false
                  capabilities:
                    drop:
                    - ALL
              - name: docker
                image: docker:20.10.16-dind
                command:
                - cat
                tty: true
                privileged: true
                volumeMounts:
                - name: docker-sock
                  mountPath: /var/run/docker.sock
              - name: kubectl
                image: bitnami/kubectl:latest
                command:
                - cat
                tty: true
                securityContext:
                  allowPrivilegeEscalation: false
                  capabilities:
                    drop:
                    - ALL
              volumes:
              - name: docker-sock
                hostPath:
                  path: /var/run/docker.sock
            '''
        }
    }
    
    environment {
        DOCKER_REGISTRY = 'docker.io/mtrivedi1410'
        IMAGE_NAME = 'intelliview-frontend'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        DOCKER_BUILDKIT = '1'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                container('nodejs') {
                    dir('intelliview_frontend/intelliview-frontend') {
                        sh '''
                        npm ci
                        npm audit
                        '''
                    }
                }
            }
        }
        
        stage('Run Tests') {
            steps {
                container('nodejs') {
                    dir('intelliview_frontend/intelliview-frontend') {
                        sh 'CI=true npm test -- --watchAll=false --coverage'
                    }
                }
            }
        }
        
        stage('Build') {
            steps {
                container('nodejs') {
                    dir('intelliview_frontend/intelliview-frontend') {
                        sh '''
                        npm run build
                        npm audit
                        '''
                    }
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                container('docker') {
                    dir('intelliview_frontend') {
                        sh '''
                        docker build --no-cache -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} .
                        docker tag ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
                        '''
                    }
                }
            }
        }
        
        stage('Security Scan') {
            steps {
                container('docker') {
                    sh 'docker scan ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} || true'
                }
            }
        }
        
        stage('Push Docker Image') {
            steps {
                container('docker') {
                    withCredentials([usernamePassword(credentialsId: 'DockerHubCredential', passwordVariable: 'DOCKER_PASSWORD', usernameVariable: 'DOCKER_USERNAME')]) {
                        sh '''
                        echo $DOCKER_PASSWORD | docker login docker.io -u $DOCKER_USERNAME --password-stdin
                        docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                        docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
                        '''
                    }
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                container('kubectl') {
                    sh 'kubectl get namespace intelliview || kubectl create namespace intelliview'
                    
                    sh '''
                    cat <<EOF | kubectl apply -f -
                    apiVersion: apps/v1
                    kind: Deployment
                    metadata:
                      name: intelliview-frontend
                      namespace: intelliview
                    spec:
                      replicas: 2
                      selector:
                        matchLabels:
                          app: intelliview-frontend
                      template:
                        metadata:
                          labels:
                            app: intelliview-frontend
                        spec:
                          securityContext:
                            runAsNonRoot: true
                            runAsUser: 1001
                            fsGroup: 1001
                          containers:
                          - name: intelliview-frontend
                            image: ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                            ports:
                            - containerPort: 80
                            env:
                            - name: REACT_APP_API_URL
                              value: "http://intelliview-backend-service"
                            - name: REACT_APP_LLM_SERVICE_URL
                              value: "http://intelliview-backend-service/api/llm"
                            resources:
                              limits:
                                cpu: "300m"
                                memory: "256Mi"
                              requests:
                                cpu: "100m"
                                memory: "128Mi"
                            securityContext:
                              allowPrivilegeEscalation: false
                              capabilities:
                                drop:
                                - ALL
                              readOnlyRootFilesystem: true
                            livenessProbe:
                              httpGet:
                                path: /
                                port: 80
                              initialDelaySeconds: 10
                              periodSeconds: 30
                            readinessProbe:
                              httpGet:
                                path: /
                                port: 80
                              initialDelaySeconds: 5
                              periodSeconds: 10
                    ---
                    apiVersion: v1
                    kind: Service
                    metadata:
                      name: intelliview-frontend-service
                      namespace: intelliview
                    spec:
                      selector:
                        app: intelliview-frontend
                      ports:
                      - port: 80
                        targetPort: 80
                      type: ClusterIP
                    EOF
                    '''
                    
                    sh '''
                    cat <<EOF | kubectl apply -f -
                    apiVersion: networking.k8s.io/v1
                    kind: Ingress
                    metadata:
                      name: intelliview-ingress
                      namespace: intelliview
                      annotations:
                        nginx.ingress.kubernetes.io/rewrite-target: /
                        nginx.ingress.kubernetes.io/ssl-redirect: "true"
                        nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
                    spec:
                      rules:
                      - host: intelliview.example.com
                        http:
                          paths:
                          - path: /
                            pathType: Prefix
                            backend:
                              service:
                                name: intelliview-frontend-service
                                port:
                                  number: 80
                          - path: /api
                            pathType: Prefix
                            backend:
                              service:
                                name: intelliview-backend-service
                                port:
                                  number: 80
                    EOF
                    '''
                    
                    sh 'kubectl rollout status deployment/intelliview-frontend -n intelliview --timeout=300s'
                }
            }
        }
    }
    
    post {
        always {
            container('docker') {
                sh 'docker logout ${DOCKER_REGISTRY}'
            }
            cleanWs()
        }
        success {
            echo 'Frontend pipeline completed successfully!'
        }
        failure {
            echo 'Frontend pipeline failed!'
        }
    }
} 