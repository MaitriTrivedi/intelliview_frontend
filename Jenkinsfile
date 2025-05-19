pipeline {
    agent {
        docker {
            image 'node:18-slim'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
            reuseNode true
        }
    }
    
    options {
        timestamps()
        durabilityHint('PERFORMANCE_OPTIMIZED')
    }
    
    environment {
        DOCKER_REGISTRY = 'docker.io/mtrivedi1410'
        IMAGE_NAME = 'intelliview-frontend'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
        DOCKER_CREDENTIALS = credentials('DockerHubCredential')
        NPM_CONFIG_CACHE = '.npm-cache'
        WORKSPACE = "${WORKSPACE}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                script {
                    dir('intelliview-frontend/intelliview-frontend') {
                        sh '''#!/bin/bash -xe
                            pwd
                            node --version
                            npm --version
                            
                            # Check if package-lock.json exists
                            if [ -f "package-lock.json" ]; then
                                echo "Using npm ci for clean install..."
                                npm ci --prefer-offline --no-audit
                            else
                                echo "No package-lock.json found, using npm install..."
                                npm install --prefer-offline --no-audit --legacy-peer-deps
                            fi
                        '''
                    }
                }
            }
        }
        
        stage('Parallel Quality Checks') {
            parallel {
                stage('Lint') {
                    steps {
                        script {
                            dir('intelliview-frontend/intelliview-frontend') {
                                sh '#!/bin/bash -xe\nCI=true npm run lint:ci || true'
                            }
                        }
                    }
                }
                
                stage('Run Tests') {
                    steps {
                        script {
                            dir('intelliview-frontend/intelliview-frontend') {
                                sh '#!/bin/bash -xe\nnpm test -- --coverage --watchAll=false --ci --passWithNoTests --maxWorkers=2'
                            }
                        }
                    }
                }
            }
        }
        
        stage('Build') {
            steps {
                script {
                    dir('intelliview-frontend/intelliview-frontend') {
                        sh '''#!/bin/bash -xe
                            export CI=true
                            export DISABLE_ESLINT_PLUGIN=true
                            npm run build
                        '''
                    }
                }
            }
        }
        
        stage('Build and Push Docker Image') {
            agent {
                docker {
                    image 'docker:20.10.16'
                    args '-v /var/run/docker.sock:/var/run/docker.sock'
                    reuseNode true
                }
            }
            steps {
                script {
                    dir('intelliview-frontend') {
                        withCredentials([usernamePassword(credentialsId: 'DockerHubCredential', passwordVariable: 'DOCKER_PASSWORD', usernameVariable: 'DOCKER_USERNAME')]) {
                            sh '''#!/bin/bash -xe
                                docker version
                                DOCKER_BUILDKIT=1 docker build \
                                    --build-arg BUILDKIT_INLINE_CACHE=1 \
                                    --cache-from ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest \
                                    -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} \
                                    -t ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest \
                                    .

                                echo $DOCKER_PASSWORD | docker login docker.io -u $DOCKER_USERNAME --password-stdin
                                docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                                docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            agent {
                docker {
                    image 'bitnami/kubectl:latest'
                    args '-v /var/run/docker.sock:/var/run/docker.sock'
                    reuseNode true
                }
            }
            steps {
                script {
                    sh '''#!/bin/bash -xe
                        kubectl version --client
                        kubectl get namespace intelliview || kubectl create namespace intelliview
                        
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
                        EOF
                        
                        cat <<EOF | kubectl apply -f -
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
                        
                        kubectl rollout status deployment/intelliview-frontend -n intelliview --timeout=180s
                    '''
                }
            }
        }
    }
    
    post {
        always {
            script {
                sh '''#!/bin/bash -xe
                    docker logout ${DOCKER_REGISTRY} || true
                '''
                cleanWs()
            }
        }
        success {
            echo 'Frontend pipeline completed successfully!'
        }
        failure {
            echo 'Frontend pipeline failed!'
        }
    }
} 